import { blake2AsHex } from '@polkadot/util-crypto';

// Generate random 32-byte salt
export function generateRandomSalt() {
    return crypto.getRandomValues(new Uint8Array(32));
}

// Convert salt to hex string for display
export function saltToHex(salt) {
    if (!salt) return '';
    return Array.from(salt)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Convert hex string back to Uint8Array
export function hexToSalt(hex) {
    if (!hex) return new Uint8Array(0);
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return new Uint8Array(bytes);
}

// Derive stealth address from username and salt (client-side)
export function deriveStealthAddress(username, salt) {
    // Remove @ prefix if present
    const cleanUsername = username.startsWith('@') ? username.slice(1) : username;

    // Convert username to bytes
    const usernameBytes = new TextEncoder().encode(cleanUsername);

    // Concatenate username + salt
    const input = new Uint8Array(usernameBytes.length + salt.length);
    input.set(usernameBytes, 0);
    input.set(salt, usernameBytes.length);

    // Hash with blake2_256
    const hash = blake2AsHex(input, 256);

    // Convert to AccountId (first 32 bytes of hash)
    // AccountId is 32 bytes, which is 64 hex characters (plus '0x' prefix)
    return hash.slice(2, 66); // Remove '0x' and take 32 bytes (64 hex chars)
}

// Format username (remove @ prefix)
export function formatUsername(username) {
    return username.startsWith('@') ? username.slice(1) : username;
}

// Copy to clipboard
export const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
        alert('Copied to clipboard!');
    });
};