import React from 'react';

function WalletConnector({ account, connected, connectWallet, disconnectWallet }) {

    return (
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            {!account ? (
                <button onClick={connectWallet} style={{ width: 'auto' }}>Connect Wallet</button>
            ) : (
                <div style={{ color: 'green' }}>Connected: {account.address.slice(0, 6)}...{account.address.slice(-4)}
                    <button onClick={disconnectWallet} style={{ marginLeft: '10px', width: 'auto', padding: '5px 10px', fontSize: '0.8em' }}>
                        Disconnect
                    </button>
                </div>
            )}
        </div>
    );
}

export default WalletConnector;