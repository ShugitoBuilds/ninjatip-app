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
                        // Keep only the last 15 blocks for the window
                        const newBlocks = [{ number: blockNumber, hash: blockHash, timestamp: Date.now() }, ...prevBlocks];
                        return newBlocks.slice(0, 15);
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
                LIVE BLOCKS
            </div>
            <div className="ticker-content">
                {blocks.map((block) => (
                    <div key={block.hash} className="block-card new-block-slide">
                        <div className="block-status"></div>
                        <div className="block-number">#{block.number}</div>
                        <div className="block-hash">{block.hash.slice(0, 6)}...{block.hash.slice(-4)}</div>
                    </div>
                ))}
                {blocks.length === 0 && (
                    <div style={{ padding: '0 20px', fontStyle: 'italic', color: '#9ca3af' }}>
                        Connecting to chain...
                    </div>
                )}
            </div>
        </div>
    );
};

export default BlockchainActivity;
