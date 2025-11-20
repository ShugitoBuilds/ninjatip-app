import React, { useState } from 'react';
import { web3FromAddress } from '@polkadot/extension-dapp';
import StatusDisplay from './StatusDisplay';

function UsernameRegistration({ contract, account }) {
    const [username, setUsername] = useState('');
    const [status, setStatus] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);

    const handleRegister = async () => {
        if (!contract || !account) return;
        if (!username) {
            setStatus('Error: Please enter a username.');
            return;
        }

        setIsRegistering(true);
        setStatus('Registering username... 📝');

        try {
            const injector = await web3FromAddress(account.address);
            const cost = BigInt(10_000_000_000_000_000_000); // 10 ASTR

            // Check if username is available first (optional, but good UX)
            // We can just try to register and catch the error, or query first.
            // Let's try to register directly.

            const tx = contract.tx.registerUsername(
                { value: cost, gasLimit: null },
                username
            );

            await tx.signAndSend(account.address, { signer: injector.signer }, ({ status, events }) => {
                if (status.isInBlock) {
                    setStatus(`Registration submitted... (Block ${status.asInBlock})`);
                } else if (status.isFinalized) {
                    let success = false;
                    events.forEach(({ event }) => {
                        if (event.method === 'UsernameRegistered') {
                            success = true;
                        }
                    });

                    if (success) {
                        setStatus(`✅ Success! You now own @${username}. Direct tips will come straight to your wallet!`);
                        setUsername('');
                    } else {
                        setStatus('❌ Registration failed. Username might be taken or payment insufficient.');
                    }
                    setIsRegistering(false);
                }
            });
        } catch (error) {
            console.error(error);
            setStatus(`Error: ${error.message}`);
            setIsRegistering(false);
        }
    };

    return (
        <div className="section registration-section" style={{ marginTop: '30px', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
            <h3>📝 Register Username</h3>
            <p className="subtitle">
                Claim your unique handle! Registered users receive tips <strong>directly to their wallet</strong> (no salt/withdraw needed).
                <br />
                <small>Cost: 10 ASTR (One-time fee)</small>
            </p>

            <div className="form-group">
                <input
                    type="text"
                    placeholder="Enter desired username (e.g., @ninja)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isRegistering}
                />
            </div>

            <button
                onClick={handleRegister}
                disabled={isRegistering || !username}
                style={{ backgroundColor: '#4b5563' }} // Grey button to distinguish from main action
            >
                {isRegistering ? 'Registering...' : 'Register Username (10 ASTR)'}
            </button>

            <StatusDisplay statusMessage={status} />
        </div>
    );
}

export default UsernameRegistration;
