import React, { useEffect } from 'react';
import './App.css';
import './index.css';

// Import Store
import { useAppStore } from './store';

// Import Components
import WalletConnector from './components/WalletConnector';
import TipForm from './components/TipForm';
import GamePlayForm from './components/GamePlayForm'; // New import
import CheckBalanceForm from './components/CheckBalanceForm';
import WithdrawForm from './components/WithdrawForm';
import PremiumRegistrationForm from './components/PremiumRegistrationForm';
import AdminPanel from './components/AdminPanel';
import CheckPremiumOwnerForm from './components/CheckPremiumOwnerForm';
import JackpotDisplay from './components/JackpotDisplay'; // New import
import StatusDisplay from './components/StatusDisplay'; // For global app status


// Import Utility Functions (only those needed directly by App or for initial setup)
// Removed saltToHex, formatUsername as they are not directly used in App, but passed to children
// Removed deriveStealthAddress, hexToSalt, generateRandomSalt, copyToClipboard from this import as they are used in sub-components
// All utility functions are now self-imported by the components that need them.

function App() {
    const { api, contract, account, connected, loading, error, initPolkadot, connectWallet } = useAppStore();

    useEffect(() => {
        initPolkadot();
    }, [initPolkadot]);


    if (loading) {
        return (
            <div className="container">
                <div className="loading">Connecting to Astar Network...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container">
                <StatusDisplay statusMessage={error} />
            </div>
        );
    }

    return (
        <div className="container">
            <h1>🥷 NinjaTip (Astar)</h1>
            <p className="subtitle">Anonymous stealth tipping on Astar Network</p>

            <WalletConnector
                account={account}
                connected={connected}
                connectWallet={connectWallet}
                disconnectWallet={useAppStore.getState().disconnectWallet} // Pass disconnect as well
            />
            {account && (
                <div style={{ textAlign: 'center', marginBottom: '20px', color: 'green' }}>
                    Connected: {account.address.slice(0, 6)}...{account.address.slice(-4)}
                    <button onClick={useAppStore.getState().disconnectWallet} style={{ marginLeft: '10px', width: 'auto', padding: '5px 10px', fontSize: '0.8em' }}>
                        Disconnect
                    </button>
                </div>
            )}

            {/* Render Jackpot Display */}
            {connected && api && contract && <JackpotDisplay />}

            {/* Render forms only if connected and account is selected */}
            {connected && api && contract && (
                <>
                    {/* Game Play Form - prominently displayed */}
                    <GamePlayForm
                        contract={contract}
                        account={account}
                    />

                    <TipForm
                        contract={contract}
                        account={account}
                    />
                    <CheckBalanceForm
                        api={api}
                        contract={contract}
                        account={account}
                    />
                    <WithdrawForm
                        contract={contract}
                        account={account}
                    />
                    <PremiumRegistrationForm
                        contract={contract}
                        account={account}
                    />
                    <CheckPremiumOwnerForm
                        contract={contract}
                    />
                    <AdminPanel
                        contract={contract}
                        account={account}
                    />
                </>
            )}
        </div>
    );
}

export default App;