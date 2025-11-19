import React, { useState } from 'react';
import StatusDisplay from './StatusDisplay';
import { formatUsername } from '../utils';

function CheckPremiumOwnerForm({ contract }) {
    const [premiumNameQuery, setPremiumNameQuery] = useState('');
    const [premiumOwner, setPremiumOwner] = useState(null);
    const [status, setStatus] = useState('');

    const handleCheckPremiumOwner = async () => {
        if (!premiumNameQuery) {
            setStatus('Error: Please enter a username to check.');
            setPremiumOwner(null);
            return;
        }

        setStatus('Checking premium owner...');
        try {
            const username = formatUsername(premiumNameQuery);
            const { result, output } = await contract.query.getPremiumOwner(
                '0x0000000000000000000000000000000000000000000000000000000000000000', // Dummy caller for query
                { gasLimit: null },
                username
            );

            if (result.isOk && output) {
                const owner = output.toHuman(); // Convert AccountId to string
                if (owner) {
                    setPremiumOwner(owner);
                    setStatus('Premium username owner found.');
                } else {
                    setPremiumOwner(null);
                    setStatus('Premium username is not registered.');
                }
            } else {
                setPremiumOwner(null);
                setStatus('Error fetching premium owner.');
            }
        } catch (error) {
            console.error('Error checking premium owner:', error);
            setStatus(`Error: ${error.message}`);
            setPremiumOwner(null);
        }
    };

    return (
        <div className="section">
            <h2>🔎 Check Premium Username Owner</h2>
            <div className="form-group">
                <label>Username</label>
                <input
                    type="text"
                    placeholder="e.g. @satoshi"
                    value={premiumNameQuery}
                    onChange={(e) => setPremiumNameQuery(e.target.value)}
                    onBlur={handleCheckPremiumOwner}
                />
            </div>
            <button onClick={handleCheckPremiumOwner}>Check Owner</button>

            {premiumOwner && (
                <div className="balance-display" style={{ marginTop: '15px' }}>
                    Owner: {premiumOwner}
                </div>
            )}
            <StatusDisplay statusMessage={status} />
        </div>
    );
}

export default CheckPremiumOwnerForm;
