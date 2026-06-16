import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'earthbeyond',
  brand: {
    displayName: 'Earth & Beyond',
    primaryColor: '#3a7bd5',
    icon: '',
  },
  web: {
    host: 'localhost',
    port: 5173,
    commands: { dev: 'vite', build: 'vite build' },
  },
  permissions: [],
  outdir: 'dist',
});
