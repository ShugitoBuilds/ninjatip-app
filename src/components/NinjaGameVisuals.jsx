import React from 'react';
import './NinjaGameVisuals.css';

const NinjaGameVisuals = ({ status, streak }) => {
    // status: 'idle', 'playing', 'won', 'lost'

    return (
        <div className="ninja-game-container">
            {/* Explosives Pile (Target) - Only show if not won (or before explosion) */}
            {status !== 'won' && (
                <div className="explosives-pile">
                    🧨
                    <span className="pile-label">Jackpot Cache</span>
                </div>
            )}

            {/* Ninja Star (Projectile) */}
            {status === 'playing' && (
                <div className="ninja-star-projectile">
                    🥷
                </div>
            )}

            {/* Result Effects */}
            {status === 'won' && (
                <div className="explosion-effect">
                    💥💰💥
                </div>
            )}

            {status === 'lost' && (
                <div className="dud-effect">
                    💨
                    <div style={{ fontSize: '0.5em', textAlign: 'center' }}>Dud</div>
                </div>
            )}

            {/* Streak Indicator */}
            {streak > 1 && (
                <div className="streak-badge">
                    🔥 Streak: {streak}x
                </div>
            )}
        </div>
    );
};

export default NinjaGameVisuals;
