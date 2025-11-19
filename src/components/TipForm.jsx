import React, { useState } from 'react';
import { web3FromAddress } from '@polkadot/extension-dapp';
import StatusDisplay from './StatusDisplay';
import { generateRandomSalt, saltToHex, formatUsername, copyToClipboard } from '../utils';

// Placeholder for the deployed frontend URL. User needs to update this after deployment.
const FRONTEND_BASE_URL = 'https://ninjatip-app.vercel.app/';

function TipForm({ contract, account }) {
    const [tipUsername, setTipUsername] = useState('');
    const [tipAmount, setTipAmount] = useState('');
    const [tipSalt, setTipSalt] = useState(null);
    const [tipStatus, setTipStatus] = useState('');

    const handleGenerateSalt = () => {
        const salt = generateRandomSalt();
        setTipSalt(salt);
        setTipStatus('');
    };

    const handleCopyTipLink = () => {
        if (!tipUsername || !tipSalt) {
            alert('Please enter a username and generate a salt first.');
            return;
        }
        const username = formatUsername(tipUsername);
        const hexSalt = saltToHex(tipSalt);
        const tipLink = `${FRONTEND_BASE_URL}/?username=${username}&salt=${hexSalt}`;
        navigator.clipboard.writeText(tipLink).then(() => alert('Copied to clipboard!'));
    };

    const handleSendTip = async () => {
        if (!account) {
            setTipStatus('Error: Please connect your wallet first!');
            return;
        }
        if (!tipUsername || !tipAmount || !tipSalt) {
            setTipStatus('Error: Please enter username, amount, and generate a salt');
            return;
        }

        setTipStatus('Sending tip...');

        try {
            const username = formatUsername(tipUsername);
            const amount = parseFloat(tipAmount);

            if (amount <= 0) {
                setTipStatus('Error: Amount must be greater than 0');
                return;
            }

            const saltArray = Array.from(tipSalt);
            const injector = await web3FromAddress(account.address);

            const decimals = 18;
            const value = BigInt(Math.floor(amount * Math.pow(10, decimals)));

            const tx = contract.tx.tip(
                { value, gasLimit: null },
                username,
                saltArray
            );

            await tx.signAndSend(account.address, { signer: injector.signer }, ({ status }) => {
                if (status.isInBlock) {
                    setTipStatus(`Tip sent in block ${status.asInBlock}! Share this salt: ${saltToHex(tipSalt)}`);
                } else if (status.isFinalized) {
                    setTipStatus(`Tip finalized! Salt: ${saltToHex(tipSalt)}`);
                } else {
                    setTipStatus(`Status: ${status.type}`);
                }
            });

        } catch (error) {
            setTipStatus(`Error: ${error.message}`);
        }
    };

    return (
        <div className="section">
            <h2>💸 Quick Tip</h2>
            <div className="form-group">
                <label>Username (e.g., @alice)</label>
                <input
                    type="text"
                    placeholder="@username"
                    value={tipUsername}
                    onChange={(e) => setTipUsername(e.target.value)}
                />
            </div>
            <div className="form-group">
                <label>Amount (ASTR)</label>
                <input
                    type="number"
                    step="0.0000000001"
                    placeholder="0.0"
                    value={tipAmount}
                    onChange={(e) => setTipAmount(e.target.value)}
                />
            </div>
            <button onClick={handleGenerateSalt}>Generate Random Salt</button>

            {tipSalt && (
                <div className="salt-display">
                    <strong>Salt (share this privately with recipient):</strong>
                    <br />
                    {saltToHex(tipSalt)}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button className="copy-btn" onClick={() => navigator.clipboard.writeText(saltToHex(tipSalt))}>
                            Copy Salt
                        </button>
                        <button className="copy-btn" onClick={handleCopyTipLink}>
                            Copy Tip Link
                        </button>
                    </div>
                </div>
            )}

            <button onClick={handleSendTip} disabled={!tipSalt || !account}>
                Send Tip
            </button>

            <StatusDisplay statusMessage={tipStatus} />
        </div>
    );
}

export default TipForm;
