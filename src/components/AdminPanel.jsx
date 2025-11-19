import React, { useState } from 'react';
import { web3FromAddress } from '@polkadot/extension-dapp';
import StatusDisplay from './StatusDisplay';

function AdminPanel({ contract, account }) {
    const [feeEnabled, setFeeEnabled] = useState(false); // Initial state should ideally come from contract query
    const [adminStatus, setAdminStatus] = useState('');

    // Fetch initial fee status (optional, can be done in main App or here on mount)
    // For simplicity, we'll assume it's set via action.

    const handleToggleFee = async () => {
        if (!account) {
            setAdminStatus('Error: Please connect your wallet first!');
            return;
        }
        setAdminStatus('Toggling fee...');
        try {
            const injector = await web3FromAddress(account.address);
            const tx = contract.tx.setFeeEnabled({ gasLimit: null }, !feeEnabled);
            await tx.signAndSend(account.address, { signer: injector.signer }, ({ status }) => {
                if (status.isFinalized) {
                    setFeeEnabled(!feeEnabled); // Update local state on success
                    setAdminStatus(`Fee status updated to ${!feeEnabled ? 'enabled' : 'disabled'}`);
                } else {
                    setAdminStatus(`Status: ${status.type}`);
                }
            });
        } catch (e) {
            setAdminStatus(`Error: ${e.message}`);
        }
    };

    const handleCollectFees = async () => {
        if (!account) {
            setAdminStatus('Error: Please connect your wallet first!');
            return;
        }
        setAdminStatus('Collecting fees...');
        try {
            const injector = await web3FromAddress(account.address);
            const tx = contract.tx.collectFees({ gasLimit: null });
            await tx.signAndSend(account.address, { signer: injector.signer }, ({ status }) => {
                if (status.isFinalized) {
                    setAdminStatus('Fees collected!');
                } else {
                    setAdminStatus(`Status: ${status.type}`);
                }
            });
        } catch (e) {
            setAdminStatus(`Error: ${e.message}`);
        }
    };

    return (
        <div className="section" style={{ border: '2px solid #ffd700' }}>
            <h2>👑 Admin Panel</h2>
            <div style={{ display: 'grid', gap: '10px' }}>
                <button onClick={handleToggleFee}>
                    {feeEnabled ? 'Disable Fees' : 'Enable Fees'}
                </button>
                <button onClick={handleCollectFees}>
                    Collect Accumulated Fees
                </button>
            </div>
            <StatusDisplay statusMessage={adminStatus} />
        </div>
    );
}

export default AdminPanel;
