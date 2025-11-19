import { create } from 'zustand';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { ContractPromise } from '@polkadot/api-contract';
import { web3Accounts, web3Enable } from '@polkadot/extension-dapp';

const CONTRACT_ADDRESS = 'XT4aydpP7aPLBxpMvM1bHrTAk9Dp8Qphaqk9FR7ugvHybFR';
const RPC_URL = 'wss://rpc.astar.network';

export const useAppStore = create((set, get) => ({
    // State
    api: null,
    contract: null,
    account: null,
    connected: false,
    loading: true,
    error: null,

    // Actions
    initPolkadot: async () => {
        set({ loading: true, error: null });
        try {
            const provider = new WsProvider(RPC_URL);
            const api = await ApiPromise.create({ provider });

            const abi = await fetch('/ninjatip.json').then(r => r.json());
            const contract = new ContractPromise(api, abi, CONTRACT_ADDRESS);

            
            set({ api, contract, connected: true, loading: false });
        } catch (error) {
            console.error('Failed to connect:', error);
            set({ error: `Failed to connect to Astar Network: ${error.message}`, loading: false });
        }
    },

    connectWallet: async () => {
        set({ error: null });
        try {
            const extensions = await web3Enable('NinjaTip');
            if (extensions.length === 0) {
                throw new Error('No extension found! Please install Talisman or SubWallet.');
            }
            const accounts = await web3Accounts();
            if (accounts.length > 0) {
                set({ account: accounts[0] });
            } else {
                throw new Error('No accounts found.');
            }
        } catch (error) {
            console.error('Error connecting wallet:', error);
            set({ error: `Error connecting wallet: ${error.message}` });
        }
    },

    disconnectWallet: () => {
        set({ account: null });
    },
}));
