import React, { useState, useRef } from 'react';
import { web3FromAddress } from '@polkadot/extension-dapp';
import StatusDisplay from './StatusDisplay';
import { generateRandomSalt, saltToHex, formatUsername } from '../utils';

// Placeholder for the deployed frontend URL. User needs to update this after deployment.
const FRONTEND_BASE_URL = 'https://ninjatip-app.vercel.app/'; // Ensure this is the actual deployed URL

function GamePlayForm({ contract, account }) {
    const [gameUsername, setGameUsername] = useState('');
    const [gameAmount, setGameAmount] = useState('');
    const [gameSalt, setGameSalt] = useState(null);
    const [gameStatus, setGameStatus] = useState('');
    const [isAnimating, setIsAnimating] = useState(false); // New state for animations

    // Refs for audio elements (if using native HTML5 Audio)
    const playSoundRef = useRef(null);
    const winSoundRef = useRef(null);
    const loseSoundRef = useRef(null);

    const handleGenerateSalt = () => {
        const salt = generateRandomSalt();
        setGameSalt(salt);
        setGameStatus('');
    };

    const handleCopyGameLink = () => {
        if (!gameUsername || !gameSalt) {
            alert('Please enter a username and generate a salt first.');
            return;
        }
        const username = formatUsername(gameUsername);
        const hexSalt = saltToHex(gameSalt);
        const gameLink = `${FRONTEND_BASE_URL}/?gameUsername=${username}&gameSalt=${hexSalt}`; // Use different query params
        copyToClipboard(gameLink);
    };

    const handlePlayGame = async () => {
        if (!account) {
            setGameStatus('Error: Please connect your wallet first!');
            return;
        }
        if (!gameUsername || !gameAmount || !gameSalt) {
            setGameStatus('Error: Please enter username, amount, and generate a salt');
            return;
        }

        setGameStatus('Playing game... Good luck!');
        setIsAnimating(true); // Start animation

        // --- Play "game start" sound ---
        if (playSoundRef.current) playSoundRef.current.play();

        try {
            const username = formatUsername(gameUsername);
            const amount = parseFloat(gameAmount);

            if (amount <= 0) {
                setGameStatus('Error: Amount must be greater than 0');
                return;
            }

            const saltArray = Array.from(gameSalt);
            const injector = await web3FromAddress(account.address);

            const decimals = 18;
            const value = BigInt(Math.floor(amount * Math.pow(10, decimals)));

            const tx = contract.tx.tipAndPlay(
                { value, gasLimit: -1 }, // -1 for gasLimit means estimate gas
                username,
                saltArray
            );

            await tx.signAndSend(account.address, { signer: injector.signer }, ({ status, events }) => {
                if (status.isInBlock) {
                    setGameStatus(`Game played in block ${status.asInBlock}!`);
                } else if (status.isFinalized) {
                    setIsAnimating(false); // End animation
                    let jackpotWon = false;
                    events.forEach(({ event }) => {
                        if (event.method === 'JackpotWon') {
                            jackpotWon = true;
                            const { winner, amount } = event.data;
                            setGameStatus(`🎉 CONGRATULATIONS! You won the jackpot of ${Number(amount)/1e18} ASTR!`);
                            // --- Play "win" sound and trigger "confetti" animation ---
                            if (winSoundRef.current) winSoundRef.current.play();
                            // Trigger confetti/celebration animation here
                        }
                    });
                    if (!jackpotWon) {
                        setGameStatus(`Game finalized. Maybe next time! Salt: ${saltToHex(gameSalt)}`);
                        // --- Play "lose" sound ---
                        if (loseSoundRef.current) loseSoundRef.current.play();
                    }
                } else {
                    setGameStatus(`Status: ${status.type}`);
                    if (status.isInvalid || status.isDropped) {
                        setIsAnimating(false); // End animation on error
                        if (loseSoundRef.current) loseSoundRef.current.play(); // Optional: play a "fail" sound
                    }
                }
            });

        } catch (error) {
            setIsAnimating(false); // End animation on error
            setGameStatus(`Error: ${error.message}`);
        }
    };

    return (
        <div className="section" style={{ border: '2px dashed #00bfff', backgroundColor: '#e6f7ff' }}>
            <h2>🎰 NinjaTip Jackpot Game!</h2>
            <p className="subtitle" style={{ color: '#007bff', marginBottom: '15px' }}>
                Tip a friend and get a chance to win the entire jackpot pool!
                A small portion of your tip goes to the owner and the jackpot.
            </p>

            {/* --- Animation Placeholder --- */}
            {isAnimating && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 100,
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    color: 'white', fontSize: '2em'
                }}>
                    {/* Replace with a real animation component (e.g., spinning wheel, slot machine) */}
                    <p>Spinning the wheel of fortune...</p>
                </div>
            )}
            {/* --- End Animation Placeholder --- */}

            <div className="form-group">
                <label>Recipient Username (e.g., @luckyfriend)</label>
                <input
                    type="text"
                    placeholder="@username"
                    value={gameUsername}
                    onChange={(e) => setGameUsername(e.target.value)}
                />
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
            <button onClick={handleGenerateSalt}>Generate Random Salt</button>

            {gameSalt && (
                <div className="salt-display">
                    <strong>Salt (share this privately with recipient):</strong>
                    <br />
                    {saltToHex(gameSalt)}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button className="copy-btn" onClick={() => copyToClipboard(saltToHex(gameSalt))}>
                            Copy Salt
                        </button>
                        <button className="copy-btn" onClick={handleCopyGameLink}>
                            Copy Game Link
                        </button>
                    </div>
                </div>
            )}

            <button onClick={handlePlayGame} disabled={!gameSalt || !account || isAnimating} style={{ marginTop: '20px' }}>
                Tip and Play!
            </button>

            <StatusDisplay statusMessage={gameStatus} />

            {/* --- Audio Elements (Hidden) --- */}
            <audio ref={playSoundRef} src="/sounds/play.mp3" preload="auto"></audio>
            <audio ref={winSoundRef} src="/sounds/win.mp3" preload="auto"></audio>
            <audio ref={loseSoundRef} src="/sounds/lose.mp3" preload="auto"></audio>
            {/* You'll need to place your sound files in the `public` folder */}
            {/* --- End Audio Elements --- */}
        </div>
    );
}

export default GamePlayForm;