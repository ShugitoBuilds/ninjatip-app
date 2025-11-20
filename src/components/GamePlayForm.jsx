import React, { useState, useRef, useEffect } from 'react';
import { web3FromAddress } from '@polkadot/extension-dapp';
import StatusDisplay from './StatusDisplay';
import NinjaGameVisuals from './NinjaGameVisuals';
import { generateRandomSalt, saltToHex, formatUsername } from '../utils';
import useAppStore from '../store';

// Placeholder for the deployed frontend URL. User needs to update this after deployment.
const FRONTEND_BASE_URL = 'https://ninjatip-app.vercel.app/'; // Ensure this is the actual deployed URL

function GamePlayForm({ contract, account }) {
    const [gameUsername, setGameUsername] = useState('');
    const [gameAmount, setGameAmount] = useState('');
    const [gameSalt, setGameSalt] = useState(null);
    const [gameStatus, setGameStatus] = useState('');
    const [visualStatus, setVisualStatus] = useState('idle'); // 'idle', 'playing', 'won', 'lost'
    const [streak, setStreak] = useState(0);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isRegistered, setIsRegistered] = useState(null); // null = unknown, true = registered, false = unregistered

    // Refs for audio elements
    const playSoundRef = useRef(null);
    const winSoundRef = useRef(null);
    const loseSoundRef = useRef(null);

    // Fetch streak on load and when account changes
    useEffect(() => {
        if (contract && account) {
            fetchStreak();
        }
    }, [contract, account]);

    const fetchStreak = async () => {
        if (!contract || !account) return;
        try {
            // The query returns (timestamp, streak_count)
            const { output } = await contract.query.getStreak(account.address, {}, account.address);
            if (output && output.isOk) {
                const [timestamp, currentStreak] = output.asOk;
                // Check if streak is active (within 10 mins)
                const now = Date.now();
                const lastPlayed = Number(timestamp); // timestamp is u64
                const windowMs = 600000; // 10 mins

                // Note: Block timestamp is in ms in Ink! usually, but let's verify. 
                // If it's not expired, show it. If expired, it will reset on next play, but we can show 0 or last known.
                // For UI, let's just show what the contract returned, maybe with a "Expired" warning if old?
                // Simpler: Just show the streak count.
                setStreak(Number(currentStreak));
            }
        } catch (e) {
            console.error("Error fetching streak:", e);
        }
    };

    const handleGenerateSalt = () => {
        const salt = generateRandomSalt();
        setGameSalt(salt);
        setGameStatus('');
        setVisualStatus('idle');
    };

    const handleCopyGameLink = () => {
        if (!gameUsername || !gameSalt) {
            alert('Please enter a username and generate a salt first.');
            return;
        }
        const username = formatUsername(gameUsername);
        const hexSalt = saltToHex(gameSalt);
        const gameLink = `${FRONTEND_BASE_URL}/?gameUsername=${username}&gameSalt=${hexSalt}`;
        navigator.clipboard.writeText(gameLink);
        alert('Game link copied to clipboard!');
    };

    const handlePlayGame = async () => {
        if (!account) {
            setGameStatus('Error: Please connect your wallet first!');
            return;
        }
        if (!gameUsername || !gameAmount) {
            setGameStatus('Error: Please enter username and amount');
            return;
        }

        // Auto-generate salt if missing
        let currentSalt = gameSalt;
        if (!currentSalt) {
            currentSalt = generateRandomSalt();
            setGameSalt(currentSalt);
        }

        setGameStatus('Throwing Ninja Star... 🥷⭐');
        setVisualStatus('playing');

        // --- Play "game start" sound (Looping) ---
        if (playSoundRef.current) {
            playSoundRef.current.currentTime = 0;
            playSoundRef.current.loop = true;
            playSoundRef.current.play().catch(e => console.log("Audio play failed", e));
        }

        try {
            const username = formatUsername(gameUsername);
            const amount = parseFloat(gameAmount);

            if (amount <= 0) {
                setGameStatus('Error: Amount must be greater than 0');
                stopAudio();
                setVisualStatus('idle');
                return;
            }

            const saltArray = Array.from(currentSalt);
            const injector = await web3FromAddress(account.address);

            const decimals = 18;
            const value = BigInt(Math.floor(amount * Math.pow(10, decimals)));

            // Call the new tip_and_play function
            const tx = contract.tx.tipAndPlay(
                { value },
                username,
                saltArray
            );

            await tx.signAndSend(account.address, { signer: injector.signer }, ({ status, events }) => {
                if (status.isInBlock) {
                    setGameStatus(`Ninja Star in flight... (Block ${status.asInBlock})`);
                } else if (status.isFinalized) {
                    stopAudio(); // Stop the looping sound

                    let jackpotWon = false;
                    let newStreak = streak;

                    events.forEach(({ event }) => {
                        if (event.method === 'JackpotWon') {
                            jackpotWon = true;
                            const { amount } = event.data;
                            setGameStatus(`🎉 BOOM! JACKPOT DETONATED! You won ${Number(amount) / 1e18} ASTR!`);
                            setVisualStatus('won');
                            if (winSoundRef.current) winSoundRef.current.play();
                        }
                        if (event.method === 'GamePlayed') {
                            // Update streak from event if available, or just refetch
                            // event.data.streak should be there
                            const { streak: eventStreak } = event.data;
                            if (eventStreak) newStreak = Number(eventStreak);
                        }
                    });

                    if (!jackpotWon) {
                        setGameStatus(`Thud. The star stuck, but no explosion. Streak: ${newStreak}x`);
                        setVisualStatus('lost');
                        if (loseSoundRef.current) loseSoundRef.current.play();
                    }

                    setStreak(newStreak); // Update streak UI

                    // Reset visual after a delay
                    setTimeout(() => {
                        if (visualStatus !== 'idle') setVisualStatus('idle');
                    }, 5000);
                } else {
                    // setGameStatus(`Status: ${status.type}`);
                    if (status.isInvalid || status.isDropped) {
                        stopAudio();
                        setVisualStatus('idle');
                        setGameStatus('Transaction failed/dropped.');
                    }
                }
            });

        } catch (error) {
            stopAudio();
            setVisualStatus('idle');

            if (error.message && error.message.includes('disconnected port object')) {
                setGameStatus('⚠️ Wallet connection lost. Please refresh the page to reconnect.');
            } else {
                setGameStatus(`Error: ${error.message}`);
            }
        }
    };

    const stopAudio = () => {
        if (playSoundRef.current) {
            playSoundRef.current.pause();
            playSoundRef.current.currentTime = 0;
        }
    };

    return (
        <div className="section game-section">
            <h2>🎰 NinjaTip Jackpot Game!</h2>
            <p className="subtitle">
                Throw a star at the Jackpot Cache! <br />
                <strong>Streak Bonus:</strong> Play again within 10 mins to boost your explosion chance! (Max 5x)
            </p>

            {/* --- Visual Game Component --- */}
            <NinjaGameVisuals status={visualStatus} streak={streak} />
            {/* ----------------------------- */}

            <div className="form-group">
                <label>
                    Recipient Username (e.g., @luckyfriend)
                    <span title="Currently, funds go to the Jackpot Pool. Username is for the record only." style={{ marginLeft: '8px', cursor: 'help', fontSize: '1.2em' }}>ℹ️</span>
                </label>
                <input
                    type="text"
                    placeholder="@username"
                    value={gameUsername}
                    onChange={(e) => {
                        setGameUsername(e.target.value);
                        setIsRegistered(null); // Reset status on change
                    }}
                    onBlur={async () => {
                        if (gameUsername && contract) {
                            try {
                                const { output } = await contract.query.getUsernameOwner(account.address, {}, gameUsername);
                                if (output && output.isOk && output.asOk.isSome) {
                                    setIsRegistered(true);
                                } else {
                                    setIsRegistered(false);
                                }
                            } catch (e) {
                                console.error("Error checking username:", e);
                            }
                        }
                    }}
                />
                {isRegistered === true && (
                    <small style={{ display: 'block', marginTop: '5px', color: '#10b981', fontWeight: 'bold' }}>
                        ✅ Registered! Tip goes directly to wallet.
                    </small>
                )}
                {isRegistered === false && (
                    <small style={{ display: 'block', marginTop: '5px', color: '#f59e0b' }}>
                        🕵️ Unregistered. Tip goes to Stealth Safe (requires salt).
                    </small>
                )}
            </div>
            <div className="form-group">
                <label>Amount to Play (ASTR)</label>
                <input
                    type="number"
                    step="0.0000000001"
                    placeholder="0.0"
                    value={gameAmount}
                    onChange={(e) => setGameAmount(e.target.value)}
                />
            </div>
            {/* <button onClick={handleGenerateSalt}>Generate Random Salt</button> */ /* Removed for consolidation */}

            <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#9ca3af',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        boxShadow: 'none'
                    }}
                >
                    {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options (Salt & Link)'}
                </button>
            </div>

            {showAdvanced && gameSalt && (
                <div className="salt-display" style={{ marginTop: '15px', padding: '15px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <strong>Salt (share this privately with recipient):</strong>
                    <br />
                    <div style={{ wordBreak: 'break-all', fontFamily: 'monospace', margin: '10px 0', color: '#6b7280' }}>
                        {saltToHex(gameSalt)}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'center' }}>
                        <button className="copy-btn" onClick={() => navigator.clipboard.writeText(saltToHex(gameSalt))}>
                            Copy Salt
                        </button>
                        <button className="copy-btn" onClick={handleCopyGameLink}>
                            Copy Game Link
                        </button>
                    </div>
                </div>
            )}

            <button
                onClick={handlePlayGame}
                disabled={!account || visualStatus === 'playing'}
                className="play-button"
                style={{ marginTop: '20px', width: '100%' }}
            >
                {visualStatus === 'playing' ? 'Throwing...' : 'Tip and Play!'}
            </button>

            <StatusDisplay statusMessage={gameStatus} />

            {/* --- Audio Elements --- */}
            <audio ref={playSoundRef} src="/sounds/play.mp3" preload="auto"></audio>
            <audio ref={winSoundRef} src="/sounds/win.mp3" preload="auto"></audio>
            <audio ref={loseSoundRef} src="/sounds/lose.mp3" preload="auto"></audio>
        </div>
    );
}

export default GamePlayForm;