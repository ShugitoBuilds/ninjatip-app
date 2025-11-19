#![cfg_attr(not(feature = "std"), no_std, no_main)]

use ink::prelude::string::String;
use ink::prelude::vec::Vec;
use ink::storage::Mapping;
use ink::env::hash::{Blake2x256, HashOutput};

/// NinjaTip - Stealth Tip Jar Contract
/// Allows anonymous tipping to usernames via stealth addresses
/// Stealth address = blake2_256(username + salt) as AccountId32
#[ink::contract]
mod ninjatip {
    use super::*;

    /// Storage structure for the NinjaTip contract
    #[ink(storage)]
    pub struct NinjaTip {
        /// Mapping of stealth addresses to their balances
        balances: Mapping<AccountId, Balance>,
        /// Mapping of stealth addresses to their last activity block number
        last_activity: Mapping<AccountId, BlockNumber>,
        /// Contract owner (deployer) - can sweep inactive funds and manage fees
        owner: AccountId,
        /// Whether fee mechanism is enabled (default: false for Day 1)
        fee_enabled: bool,
        /// Fee rate in basis points (50 = 0.5%, 100 = 1%, max 1%)
        fee_rate: u8,
        /// Accumulated fees collected (for owner withdrawal)
        accumulated_fees: Balance,
        /// Reserved premium usernames → owner (for future monetization)
        premium_usernames: Mapping<String, AccountId>,
        /// --- Gamification Fields ---
        /// The current jackpot pool amount.
        jackpot_pool: Balance,
        /// The account ID of the last jackpot winner.
        last_jackpot_winner: Option<AccountId>,
        /// A counter for the number of game plays, used for pseudo-randomness.
        game_play_count: u64,
    }

    /// Event emitted when a tip is received
    #[ink(event)]
    pub struct TipReceived {
        #[ink(topic)]
        username: String,
        #[ink(topic)]
        amount: Balance,
        #[ink(topic)]
        stealth_address: AccountId,
        fee: Balance,
    }

    /// Event emitted when funds are withdrawn
    #[ink(event)]
    pub struct Withdrawn {
        #[ink(topic)]
        username: String,
        #[ink(topic)]
        amount: Balance,
        #[ink(topic)]
        stealth_address: AccountId,
    }

    /// Event emitted when fee mechanism is toggled
    #[ink(event)]
    pub struct FeeToggled {
        enabled: bool,
    }

    /// Event emitted when fees are collected by owner
    #[ink(event)]
    pub struct FeeCollected {
        #[ink(topic)]
        amount: Balance,
    }

    /// Event emitted when a premium username is registered
    #[ink(event)]
    pub struct PremiumRegistered {
        #[ink(topic)]
        username: String,
        #[ink(topic)]
        owner: AccountId,
        cost: Balance,
    }

    // --- Gamification Events ---
    /// Event emitted when a user plays the tipping game.
    #[ink(event)]
    pub struct GamePlayed {
        #[ink(topic)]
        caller: AccountId,
        tip_amount: Balance,
        owner_fee: Balance,
        jackpot_contribution: Balance,
    }

    /// Event emitted when a user wins the jackpot.
    #[ink(event)]
    pub struct JackpotWon {
        #[ink(topic)]
        winner: AccountId,
        amount: Balance,
    }

    /// Error types for the contract
    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        /// Only the owner can perform this action
        NotOwner,
        /// Only the stealth address owner can withdraw
        NotStealthOwner,
        /// No funds available to withdraw
        NoFunds,
        /// Invalid fee rate (must be between 50-100 basis points)
        InvalidFeeRate,
        /// Username is too long
        UsernameTooLong,
        /// Amount must be greater than zero
        InvalidAmount,
        /// Username is already registered as premium
        UsernameTaken,
        /// Payment insufficient for premium registration
        InsufficientPayment,
    }

    impl NinjaTip {
        /// Constructor - creates a new NinjaTip contract
        /// Sets owner to deployer, fee_enabled=false, fee_rate=50 (0.5%)
        #[ink(constructor)]
        pub fn new() -> Self {
            let caller = Self::env().caller();
            Self {
                balances: Mapping::default(),
                last_activity: Mapping::default(),
                owner: caller,
                fee_enabled: false,
                fee_rate: 50, // 0.5% default
                accumulated_fees: 0,
                premium_usernames: Mapping::default(),
                // --- Gamification Init ---
                jackpot_pool: 0,
                last_jackpot_winner: None,
                game_play_count: 0,
            }
        }

        /// Send a tip to a username
        /// Derives stealth address from username + salt, applies fee if enabled
        /// Updates balance and last_activity
        #[ink(message, payable)]
        pub fn tip(&mut self, username: String, salt: [u8; 32]) -> Result<(), Error> {
            // Validate username length (max 64 bytes)
            if username.len() > 64 {
                return Err(Error::UsernameTooLong);
            }

            let amount = self.env().transferred_value();
            if amount == 0 {
                return Err(Error::InvalidAmount);
            }

            // Derive stealth address from username + salt
            let stealth_address = Self::derive_stealth_address(&username, &salt);

            // Calculate fee if enabled
            let fee = if self.fee_enabled {
                ((amount as u128).checked_mul(self.fee_rate as u128)
                    .and_then(|x| x.checked_div(10000))
                    .unwrap_or(0)) as Balance
            } else {
                0
            };

            let tip_amount = amount.checked_sub(fee).unwrap_or(0);

            // Update balance
            let current_balance = self.balances.get(&stealth_address).unwrap_or(0);
            let new_balance = current_balance.checked_add(tip_amount).unwrap_or(current_balance);
            self.balances.insert(&stealth_address, &new_balance);

            // Update last activity
            let current_block = self.env().block_number();
            self.last_activity.insert(&stealth_address, &current_block);

            // Accumulate fees if any
            if fee > 0 {
                self.accumulated_fees = self.accumulated_fees.checked_add(fee).unwrap_or(self.accumulated_fees);
            }

            // Emit event
            self.env().emit_event(TipReceived {
                username,
                amount: tip_amount,
                stealth_address,
                fee: fee as Balance,
            });

            Ok(())
        }

        /// --- GAMIFICATION ---
        /// Sends a tip and enters the jackpot game.
        /// A portion of the tip goes to the jackpot, another to the owner, and the rest to the recipient.
        /// The tipper has a chance to win the entire jackpot.
        #[ink(message, payable)]
        pub fn tip_and_play(&mut self, username: String, salt: [u8; 32]) -> Result<(), Error> {
            const JACKPOT_CONTRIBUTION_RATE: u8 = 50; // 0.5%
            const WINNING_NUMBER: u32 = 777; // The lucky number for the jackpot

            let caller = self.env().caller();
            let amount = self.env().transferred_value();

            if username.len() > 64 {
                return Err(Error::UsernameTooLong);
            }
            if amount == 0 {
                return Err(Error::InvalidAmount);
            }

            // --- Fee Calculation ---
            // 1. Owner's fee
            let owner_fee = ((amount as u128).checked_mul(self.fee_rate as u128)
                .and_then(|x| x.checked_div(10000))
                .unwrap_or(0)) as Balance;
            
            // 2. Jackpot contribution
            let jackpot_fee = ((amount as u128).checked_mul(JACKPOT_CONTRIBUTION_RATE as u128)
                .and_then(|x| x.checked_div(10000))
                .unwrap_or(0)) as Balance;

            let total_fees = owner_fee.checked_add(jackpot_fee).unwrap_or(owner_fee);
            let tip_amount = amount.checked_sub(total_fees).unwrap_or(0);

            // --- Fund Distribution ---
            self.accumulated_fees = self.accumulated_fees.checked_add(owner_fee).unwrap_or(self.accumulated_fees);
            self.jackpot_pool = self.jackpot_pool.checked_add(jackpot_fee).unwrap_or(self.jackpot_pool);

            // Send tip to stealth address
            let stealth_address = Self::derive_stealth_address(&username, &salt);
            let current_balance = self.balances.get(&stealth_address).unwrap_or(0);
            let new_balance = current_balance.checked_add(tip_amount).unwrap_or(current_balance);
            self.balances.insert(&stealth_address, &new_balance);

            // --- Jackpot Luck Mechanic (Pseudo-Random) ---
            let seed_material = (
                self.env().block_timestamp(),
                self.env().block_number(),
                self.game_play_count,
                caller,
            );
            let mut seed_hash = <Blake2x256 as HashOutput>::Type::default();
            ink::env::hash_encoded::<Blake2x256, _>(&seed_material, &mut seed_hash);
            
            // A simple way to get a number from the hash
            let lucky_draw = u32::from_le_bytes(seed_hash[0..4].try_into().unwrap());
            
            if lucky_draw % 1000 == WINNING_NUMBER {
                // Winner!
                let jackpot = self.jackpot_pool;
                if jackpot > 0 {
                    self.jackpot_pool = 0; // Reset pool
                    self.last_jackpot_winner = Some(caller);
                    // Attempt to transfer the jackpot to the winner
                    if self.env().transfer(caller, jackpot).is_ok() {
                        // Jackpot transfer successful. Emit the event.
                        self.env().emit_event(JackpotWon {
                            winner: caller,
                            amount: jackpot,
                        });
                    } else {
                        // If transfer fails, revert the state change
                        self.jackpot_pool = jackpot; 
                        self.last_jackpot_winner = None;
                    }
                }
            }

            self.game_play_count = self.game_play_count.wrapping_add(1);

            // Emit GamePlayed event
            self.env().emit_event(GamePlayed {
                caller,
                tip_amount,
                owner_fee,
                jackpot_contribution: jackpot_fee,
            });

            Ok(())
        }

        

        /// Withdraw funds from a stealth address

        /// Only the caller who can derive the same stealth address can withdraw

        #[ink(message)]

        pub fn withdraw(&mut self, username: String, salt: [u8; 32]) -> Result<(), Error> {

            let caller = self.env().caller();



            // Derive stealth address

            let stealth_address = Self::derive_stealth_address(&username, &salt);



            // Get balance

            let balance = self.balances.get(&stealth_address).unwrap_or(0);

            if balance == 0 {

                return Err(Error::NoFunds);

            }

            // Clear balance
            self.balances.insert(&stealth_address, &0);

            // Transfer funds to caller
            self.env()
                .transfer(caller, balance)
                .map_err(|_| Error::NoFunds)?;

            // Update last activity
            let current_block = self.env().block_number();
            self.last_activity.insert(&stealth_address, &current_block);

            // Emit event
            self.env().emit_event(Withdrawn {
                username,
                amount: balance,
                stealth_address,
            });

            Ok(())
        }

        /// Get the balance of a stealth address
        /// View function - no state changes
        #[ink(message)]
        pub fn get_stealth_balance(&self, username: String, salt: [u8; 32]) -> Balance {
            let stealth_address = Self::derive_stealth_address(&username, &salt);
            self.balances.get(&stealth_address).unwrap_or(0)
        }

        /// Sweep inactive funds (owner only)
        /// Sweeps addresses that have been inactive for ~1.5M blocks
        #[ink(message)]
        pub fn sweep_inactive(&mut self) -> Result<(), Error> {
            let caller = self.env().caller();
            if caller != self.owner {
                return Err(Error::NotOwner);
            }

            let _current_block = self.env().block_number();
            let _inactivity_threshold = 1_500_000u64;

            // Note: In a real implementation, we'd need to iterate over all entries
            // For now, this is a placeholder - in production you'd need a list of addresses
            // or use a different storage pattern that allows iteration
            // This function demonstrates the logic but would need enhancement for full functionality

            Ok(())
        }

        /// Set fee enabled status (owner only)
        #[ink(message)]
        pub fn set_fee_enabled(&mut self, enabled: bool) -> Result<(), Error> {
            let caller = self.env().caller();
            if caller != self.owner {
                return Err(Error::NotOwner);
            }

            self.fee_enabled = enabled;
            self.env().emit_event(FeeToggled { enabled });

            Ok(())
        }

        /// Set fee rate (owner only)
        /// Rate must be between 50-100 basis points (0.5% - 1%)
        #[ink(message)]
        pub fn set_fee_rate(&mut self, rate: u8) -> Result<(), Error> {
            let caller = self.env().caller();
            if caller != self.owner {
                return Err(Error::NotOwner);
            }

            if rate < 50 || rate > 100 {
                return Err(Error::InvalidFeeRate);
            }

            self.fee_rate = rate;
            Ok(())
        }

        /// Collect accumulated fees (owner only)
        #[ink(message)]
        pub fn collect_fees(&mut self) -> Result<(), Error> {
            let caller = self.env().caller();
            if caller != self.owner {
                return Err(Error::NotOwner);
            }

            let fees = self.accumulated_fees;
            if fees == 0 {
                return Err(Error::NoFunds);
            }

            self.accumulated_fees = 0;
            self.env()
                .transfer(caller, fees)
                .map_err(|_| Error::NoFunds)?;

            self.env().emit_event(FeeCollected { amount: fees });

            Ok(())
        }

        /// Get fee enabled status
        #[ink(message)]
        pub fn get_fee_enabled(&self) -> bool {
            self.fee_enabled
        }

        /// Get fee rate
        #[ink(message)]
        pub fn get_fee_rate(&self) -> u8 {
            self.fee_rate
        }

        /// Get accumulated fees
        #[ink(message)]
        pub fn get_accumulated_fees(&self) -> Balance {
            self.accumulated_fees
        }

        // --- Gamification Queries ---
        /// Get the current jackpot pool amount.
        #[ink(message)]
        pub fn get_jackpot_pool(&self) -> Balance {
            self.jackpot_pool
        }

        /// Get the last jackpot winner.
        #[ink(message)]
        pub fn get_last_jackpot_winner(&self) -> Option<AccountId> {
            self.last_jackpot_winner
        }

        /// Get the total number of game plays.
        #[ink(message)]
        pub fn get_game_play_count(&self) -> u64 {
            self.game_play_count
        }

        /// Register a premium username
        /// Requires a fee (e.g., 100 ASTR)
        #[ink(message, payable)]
        pub fn register_premium_username(&mut self, username: String) -> Result<(), Error> {
            // Validate username length
            if username.len() > 64 {
                return Err(Error::UsernameTooLong);
            }

            // Check if already taken
            if self.premium_usernames.contains(&username) {
                return Err(Error::UsernameTaken);
            }

            // Check payment (100 ASTR = 100 * 10^18)
            // For simplicity in this demo, let's say 10 ASTR
            let cost: Balance = 10_000_000_000_000_000_000; // 10 ASTR
            let transferred = self.env().transferred_value();

            if transferred < cost {
                return Err(Error::InsufficientPayment);
            }

            // Register
            let caller = self.env().caller();
            self.premium_usernames.insert(&username, &caller);

            // Add to accumulated fees (owner profit)
            self.accumulated_fees = self.accumulated_fees.checked_add(transferred).unwrap_or(self.accumulated_fees);

            // Emit event
            self.env().emit_event(PremiumRegistered {
                username,
                owner: caller,
                cost: transferred,
            });

            Ok(())
        }

        /// Get the owner of a premium username
        #[ink(message)]
        pub fn get_premium_owner(&self, username: String) -> Option<AccountId> {
            self.premium_usernames.get(&username)
        }

        /// Derive stealth address from username and salt
        /// Uses blake2_256 hash of (username bytes + salt) → AccountId32
        /// Inspired by Plata Mia's stealth address pattern
        fn derive_stealth_address(username: &String, salt: &[u8; 32]) -> AccountId {
            // Concatenate username bytes (UTF-8) with salt
            let mut input = Vec::new();
            input.extend_from_slice(username.as_bytes());
            input.extend_from_slice(salt);

            // Hash with blake2_256
            let mut output = <Blake2x256 as HashOutput>::Type::default();
            ink::env::hash_bytes::<Blake2x256>(&input, &mut output);

            // Convert hash output to AccountId32
            // AccountId::from expects a 32-byte array
            AccountId::from(output)
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[ink::test]
        fn test_stealth_address_derivation() {
            let username = String::from("alice");
            let salt = [1u8; 32];
            let stealth = NinjaTip::derive_stealth_address(&username, &salt);
            // Same inputs should produce same output
            let stealth2 = NinjaTip::derive_stealth_address(&username, &salt);
            assert_eq!(stealth, stealth2);
        }

        #[ink::test]
        fn test_different_salts_produce_different_addresses() {
            let username = String::from("alice");
            let salt1 = [1u8; 32];
            let salt2 = [2u8; 32];
            let stealth1 = NinjaTip::derive_stealth_address(&username, &salt1);
            let stealth2 = NinjaTip::derive_stealth_address(&username, &salt2);
            assert_ne!(stealth1, stealth2);
        }
    }
}

