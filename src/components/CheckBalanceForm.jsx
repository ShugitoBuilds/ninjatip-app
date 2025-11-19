import React, { useState } from 'react';
import StatusDisplay from './StatusDisplay';
import { deriveStealthAddress, hexToSalt, formatUsername } from '../utils';
import { useAppStore } from '../store'; // To get CONTRACT_ADDRESS from store directly

// Configuration (can be moved to a config file if many constants)
const CONTRACT_ADDRESS = 'XT4aydpP7aPLBxpMvM1bHrTAk9Dp8Qphaqk9FR7ugvHybFR'; // Redefine or import globally if needed

function CheckBalanceForm({ api, contract, account }) {
    const [checkUsername, setCheckUsername] = useState('');
    const [checkSalt, setCheckSalt] = useState('');
    const [balance, setBalance] = useState(null);
    const [stealthAddr, setStealthAddr] = useState('');
    const [status, setStatus] = useState('');

    const handleCheckBalance = async () => {
        if (!checkUsername || !checkSalt) {
            setBalance(null);
            setStealthAddr('');
            setStatus('Please enter both username and salt to check balance.');
            return;
        }

        setStatus('Checking balance...');

        try {
            const username = formatUsername(checkUsername);
            const salt = hexToSalt(checkSalt.replace(/^0x/, ''));

            const addr = deriveStealthAddress(username, salt);
            setStealthAddr(addr);

            // Use a dummy address for read-only query if not connected
            // Using the locally defined CONTRACT_ADDRESS for read-only if no account
            const caller = account ? account.address : CONTRACT_ADDRESS;

            const { result, output } = await contract.query.getStealthBalance(
                caller,
                {},
                username,
                Array.from(salt)
            );

            if (result.isOk && output) {
                const rawBalance = output.toString(); // BigInt string
                const formatted = (Number(rawBalance) / 1e18).toFixed(4); // Astar has 18 decimals
                setBalance(formatted);
                setStatus('Balance fetched successfully.');
            } else {
                setBalance('Error fetching');
                setStatus('Error fetching balance.');
            }
        } catch (error) {
            console.error(error);
            setBalance('Error');
            setStatus(`Error: ${error.message}`);
        }
    };

    return (
        <div className="section">
            <h2>💰 Check Balance</h2>
            <div className="form-group">
                <label>Username</label>
                <input
                    type="text"
                    placeholder="@username"
                    value={checkUsername}
                    onChange={(e) => setCheckUsername(e.target.value)}
                    onBlur={handleCheckBalance}
                />
            </div>
            <div className="form-group">
                <label>Salt (hex string)</label>
                <input
                    type="text"
                    placeholder="0x..."
                    value={checkSalt}
                    onChange={(e) => setCheckSalt(e.target.value)}
                    onBlur={handleCheckBalance}
                />
            </div>
            <button onClick={handleCheckBalance} style={{ marginTop: '10px' }}>Check Now</button>

            {balance !== null && (
                <div className="balance-display">
                    Balance: {balance} ASTR
                    {stealthAddr && (
                        <div className="stealth-address">
                            Stealth Address: {stealthAddr}
                        </div>
                    )}
                </div>
            )}
            <StatusDisplay statusMessage={status} />
        </div>
    );
}

export default CheckBalanceForm;
