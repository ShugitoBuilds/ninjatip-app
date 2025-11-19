import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'polkadot-vendor': ['@polkadot/api', '@polkadot/extension-dapp', '@polkadot/util-crypto', '@polkadot/api-contract'],
          'react-vendor': ['react', 'react-dom'],
        }
      }
    }
  }
})