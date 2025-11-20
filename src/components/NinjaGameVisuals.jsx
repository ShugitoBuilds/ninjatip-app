import React from 'react';
import './NinjaGameVisuals.css';

const NinjaGameVisuals = ({ status, streak }) => {
    // status: 'idle', 'playing', 'won', 'lost'

    return (
        <div className="ninja-game-container">
            {/* Streak Indicator */}
            {streak > 1 && (
                <div className="streak-badge">
                    🔥 Streak: {streak}x
                </div>
            )}

            <div className="game-scene">
                {/* Target (Explosives Cache) - Always visible unless exploded */}
                {status !== 'won' && (
                    <div className="target-cache">
                        🧨
                    </div>
                )}

                {/* Ninja Star (Projectile) */}
                {/* Show it if playing, or if we want to show it idle? 
                    Let's show it idle on the left, and throwing when playing. */}
                {(status === 'idle' || status === 'playing') && (
                    <div className={`ninja-star ${status === 'playing' ? 'throwing spinning' : ''}`}>
                        🥷
                    </div>
                )}

                {/* Result Effects */}
                {status === 'won' && (
                    <div className="explosion">
                        💥💰💥
                    </div>
                )}

                {status === 'lost' && (
                    <div className="dud-effect">
                        💨
                        <div style={{ fontSize: '0.5em', textAlign: 'center', color: '#fff' }}>Dud</div>
                    </div>
                )}
            </div>

            {/* Status Text Overlay if needed, or keep it external */}
        </div>
    );
};

export default NinjaGameVisuals;
