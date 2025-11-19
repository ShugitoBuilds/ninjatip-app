import React, { useState } from 'react';
import { web3FromAddress } from '@polkadot/extension-dapp';
import StatusDisplay from './StatusDisplay';
import { hexToSalt, formatUsername } from '../utils'; // Import utility functions

function WithdrawForm({ contract, account }) { // Removed utility functions from props
    const [withdrawUsername, setWithdrawUsername] = useState('');
    const [withdrawSalt, setWithdrawSalt] = useState('');
    const [withdrawStatus, setWithdrawStatus] = useState('');

    const handleWithdraw = async () => {
        if (!account) {
            setWithdrawStatus('Error: Please connect your wallet first!');
            return;
        }
        if (!withdrawUsername || !withdrawSalt) {
            setWithdrawStatus('Error: Please enter username and salt');
            return;
        }

        setWithdrawStatus('Withdrawing...');

        try {
            const username = formatUsername(withdrawUsername);
            const salt = hexToSalt(withdrawSalt.replace(/^0x/, ''));
            const saltArray = Array.from(salt);
            const injector = await web3FromAddress(account.address);

            const tx = contract.tx.withdraw(
                { gasLimit: null },
                username,
                saltArray
            );

            await tx.signAndSend(account.address, { signer: injector.signer }, ({ status }) => {
                if (status.isInBlock) {
                    setWithdrawStatus(`Withdrawal in block!`);
                } else if (status.isFinalized) {
                    setWithdrawStatus(`Withdrawal success! Check your wallet.`);
                } else {
                    setWithdrawStatus(`Status: ${status.type}`);
                }
            });

        } catch (error) {
            setWithdrawStatus(`Error: ${error.message}`);
        }
    };

    return (
        <div className="section">
            <h2>🏦 Withdraw Funds</h2>
            <div className="form-group">
                <label>Username</label>
                <input
                    type="text"
                    placeholder="@username"
                    value={withdrawUsername}
                    onChange={(e) => setWithdrawUsername(e.target.value)}
                />
            </div>
            <div className="form-group">
                <label>Salt (hex string)</label>
                <input
                    type="text"
                    placeholder="0x..."
                    value={withdrawSalt}
                    onChange={(e) => setWithdrawSalt(e.target.value)}
                />
            </div>
            <button onClick={handleWithdraw} disabled={!account}>Withdraw All Funds</button>

            <StatusDisplay statusMessage={withdrawStatus} />
        </div>
    );
}

export default WithdrawForm;