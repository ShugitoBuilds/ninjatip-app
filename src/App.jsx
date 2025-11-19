import React, { useEffect } from 'react';
import './App.css';
import './index.css';

// Import Store
import { useAppStore } from './store';

// Import Components
import WalletConnector from './components/WalletConnector';
import GamePlayForm from './components/GamePlayForm';
import BlockchainActivity from './components/BlockchainActivity'; // New import

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
            <BlockchainActivity />
            <h1>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4Z" fill="#ef4444" opacity="0.2" />
                    <path d="M12 6C9.79 6 8 7.79 8 10V14C8 16.21 9.79 18 12 18C14.21 18 16 16.21 16 14V10C16 7.79 14.21 6 12 6ZM10 10C10 9.45 10.45 9 11 9C11.55 9 12 9.45 12 10C12 10.55 11.55 11 11 11C10.45 11 10 10.55 10 10ZM14 10C14 9.45 14.45 9 15 9C15.55 9 16 9.45 16 10C16 10.55 15.55 11 15 11C14.45 11 14 10.55 14 10ZM12 16C10.9 16 10 15.1 10 14H14C14 15.1 13.1 16 12 16Z" fill="#1f2937" />
                    <path d="M7.5 12L4 14" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" />
                    <path d="M16.5 12L20 14" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" />
                </svg>
                NinjaTip (Astar)
            </h1>
            <p className="subtitle">Anonymous stealth tipping on Astar Network</p>

            <WalletConnector
                account={account}
                connected={connected}
                connectWallet={connectWallet}
                disconnectWallet={useAppStore.getState().disconnectWallet} // Pass disconnect as well
            />


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
                </>
            )}
            <footer style={{ textAlign: 'center', marginTop: '30px', fontSize: '0.8em', color: '#aaa' }}>
                v1.1.0 (Gamified Update)
            </footer>
        </div>
    );
}

export default App;