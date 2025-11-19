import React from 'react';

function StatusDisplay({ statusMessage }) {
    if (!statusMessage) return null;

    const type = statusMessage.includes('Error') ? 'error' : statusMessage.includes('finalized') || statusMessage.includes('success') ? 'success' : 'info';

    return (
        <div className={`status ${type}`}>
            {statusMessage}
        </div>
    );
}

export default StatusDisplay;
