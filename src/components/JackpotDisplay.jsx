import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import StatusDisplay from './StatusDisplay';

function JackpotDisplay() {
    const { api, contract, connected } = useAppStore();
    const [jackpotPool, setJackpotPool] = useState('0.0000');
    const [lastWinner, setLastWinner] = useState('N/A');
    const [status, setStatus] = useState('');

    useEffect(() => {
        let interval;
        if (connected && api && contract) {
            const fetchJackpotData = async () => {
                try {
                    // Fetch Jackpot Pool
                    const { output: poolOutput } = await contract.query.getJackpotPool(
                        '0x0000000000000000000000000000000000000000000000000000000000000000', // Dummy caller for query
                        {}
                    );
                    if (poolOutput) {
                        const rawPool = poolOutput.toString();
                        setJackpotPool((Number(rawPool) / 1e18).toFixed(4));
                    }

                    // Fetch Last Winner
                    const { output: winnerOutput } = await contract.query.getLastJackpotWinner(
                        '0x0000000000000000000000000000000000000000000000000000000000000000', // Dummy caller for query
                        {}
                    );
                    if (winnerOutput && winnerOutput.isSome) {
                        setLastWinner(winnerOutput.toHuman());
                    } else {
                        setLastWinner('N/A');
                    }
                    setStatus('');
                } catch (err) {
                    console.error("Error fetching jackpot data:", err);
                    setStatus(`Error fetching jackpot data: ${err.message}`);
                }
            };

            fetchJackpotData(); // Fetch immediately on connect
            interval = setInterval(fetchJackpotData, 15000); // Fetch every 15 seconds
        } else {
            setJackpotPool('0.0000');
            setLastWinner('N/A');
            setStatus('Not connected to contract.');
        }

        return () => clearInterval(interval); // Cleanup on unmount or disconnect
    }, [connected, api, contract]);

    return (
        <div className="section" style={{ border: '2px solid #ff007f', backgroundColor: '#ffe6f2', textAlign: 'center' }}>
            <h2>🏆 Current Jackpot Pool</h2>
            <h1 style={{ color: '#ff007f', fontSize: '3em', margin: '10px 0' }}>
                {jackpotPool} ASTR
            </h1>
            <p style={{ fontSize: '1.1em', color: '#555' }}>
                Last Winner: <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{lastWinner.slice(0, 6)}...{lastWinner.slice(-4)}</span>
            </p>
            <StatusDisplay statusMessage={status} />
        </div>
    );
}

export default JackpotDisplay;
