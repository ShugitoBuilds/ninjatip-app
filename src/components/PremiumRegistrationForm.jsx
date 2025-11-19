import React, { useState } from 'react';
import { web3FromAddress } from '@polkadot/extension-dapp';
import StatusDisplay from './StatusDisplay';

function PremiumRegistrationForm({ contract, account }) {
    const [premiumName, setPremiumName] = useState('');
    const [premiumStatus, setPremiumStatus] = useState('');

    const handleRegisterPremium = async () => {
        if (!account) {
            setPremiumStatus('Error: Please connect your wallet first!');
            return;
        }
        if (!premiumName) {
            setPremiumStatus('Error: Enter a username');
            return;
        }
        setPremiumStatus('Registering...');
        try {
            const injector = await web3FromAddress(account.address);
            // Cost is 10 ASTR (10 * 10^18 Planck)
            const cost = BigInt(10) * BigInt(1e18);

            const tx = contract.tx.registerPremiumUsername(
                { value: cost, gasLimit: -1 },
                premiumName
            );

            await tx.signAndSend(account.address, { signer: injector.signer }, ({ status }) => {
                if (status.isInBlock) {
                    setPremiumStatus('Registration in block!');
                } else if (status.isFinalized) {
                    setPremiumStatus('Registered successfully!');
                } else {
                    setPremiumStatus(`Status: ${status.type}`);
                }
            });
        } catch (error) {
            setPremiumStatus(`Error: ${error.message}`);
        }
    };

    return (
        <div className="section">
            <h2>🏆 Premium Username</h2>
            <p style={{ marginBottom: '15px', fontSize: '0.9em', color: '#666' }}>
                Register a permanent username for 10 ASTR.
            </p>
            <div className="form-group">
                <input
                    type="text"
                    placeholder="Username (e.g. @satoshi)"
                    value={premiumName}
                    onChange={(e) => setPremiumName(e.target.value)}
                />
            </div>
            <button onClick={handleRegisterPremium} disabled={!account}>
                Register (10 ASTR)
            </button>
            <StatusDisplay statusMessage={premiumStatus} />
        </div>
    );
}

export default PremiumRegistrationForm;
