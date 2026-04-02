import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(async ({mode}) => {
  const env = loadEnv(mode, '.', '');
  const isStaging = mode === 'staging';
  const isProduction = mode === 'production';

  let pwaPlugin: any = null;
  try {
    const mod = await import('vite-plugin-pwa');
    pwaPlugin = mod.VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Orchade',
        short_name: 'Orchade',
        theme_color: '#5BC46D',
        background_color: '#101412',
        display: 'standalone',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    });
  } catch (error) {
    console.warn('vite-plugin-pwa not installed; continuing without plugin support', error);
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
        manifest: {
          name: 'Orchade',
          short_name: 'Orchade',
          theme_color: '#5BC46D',
          background_color: '#101412',
          display: 'standalone',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      __AAA_SHELL_ENV__: JSON.stringify(isStaging ? 'staging' : 'production'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      outDir: isStaging ? 'dist-staging' : 'dist',
      sourcemap: isStaging,
      minify: isProduction,
    },
  };
});
