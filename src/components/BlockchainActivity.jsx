import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import './BlockchainActivity.css';

const BlockchainActivity = () => {
    const { api } = useAppStore();
    const [blocks, setBlocks] = useState([]);

    useEffect(() => {
        if (!api) return;

        let unsubscribe = null;

        const subscribeToBlocks = async () => {
            try {
                unsubscribe = await api.rpc.chain.subscribeNewHeads((header) => {
                    const blockNumber = header.number.toNumber();
                    const blockHash = header.hash.toHex();

                    setBlocks(prevBlocks => {
                        // Keep only the last 10 blocks
                        const newBlocks = [{ number: blockNumber, hash: blockHash }, ...prevBlocks];
                        return newBlocks.slice(0, 10);
                    });
                });
            } catch (error) {
                console.error("Failed to subscribe to new heads:", error);
            }
        };

        subscribeToBlocks();

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [api]);

    if (!api) return null;

    return (
        <div className="blockchain-ticker-container">
            <div className="ticker-label">
                🔗 LIVE ACTIVITY
            </div>
            <div className="ticker-content">
                {blocks.map((block) => (
                    <div key={block.hash} className="block-item new-block-flash">
                        <span className="block-number">#{block.number}</span>
                        <span className="block-hash">[{block.hash.slice(0, 6)}...{block.hash.slice(-4)}]</span>
                    </div>
                ))}
                {blocks.length === 0 && (
                    <div className="block-item" style={{ fontStyle: 'italic', color: '#666' }}>
                        Waiting for blocks...
                    </div>
                )}
            </div>
        </div>
    );
};

export default BlockchainActivity;
