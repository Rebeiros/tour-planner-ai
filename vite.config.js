import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        if (
          warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
          warning.message?.includes('"use client"') &&
          warning.id?.includes('node_modules/framer-motion')
        ) {
          return;
        }
        defaultHandler(warning);
      },
    },
  },
});
