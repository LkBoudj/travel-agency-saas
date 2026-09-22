import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Read .env here too, so the dev port lives in the same file as every other
  // configurable value. `import.meta.env` is not available inside this config.
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    plugins: [react()],
    server: {
      // Pinned: the backend CORS allowlist matches the origin exactly, so a
      // drifting dev port (5173 -> 5174 -> 5175 when other apps are running)
      // silently blocks every request. strictPort fails loudly instead.
      port: Number(env.VITE_DEV_PORT) || 5175,
      strictPort: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
        '@test-utils': path.resolve(import.meta.dirname, './test-utils'),
      },
    },
    test: {
      globals: true,
      passWithNoTests: true,
      environment: 'jsdom',
      setupFiles: './vitest.setup.mjs',
      // Pure logic modules are exercised under `node --test`, not vitest —
      // they are node-runnable and must stay free of vitest globals.
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        'src/config/env.test.ts',
        'src/services/api.test.ts',
        'src/i18n/locales.test.ts',
      ],
    },
  };
});
