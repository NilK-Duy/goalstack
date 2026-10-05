import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// One config for dev, build and test — Vitest reads this file, so the `@` alias
// can't drift between the app and its tests.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // Everything under test is pure logic; no DOM needed.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
