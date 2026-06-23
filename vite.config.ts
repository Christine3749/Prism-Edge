import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const assetVersion = process.env.PRISM_ASSET_VERSION || Date.now().toString(36);

  return {
    root: path.resolve(__dirname, 'apps/web'),
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@shared': path.resolve(__dirname, 'packages/shared/src'),
        '@ui': path.resolve(__dirname, 'packages/ui/src'),
      },
    },
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
      rollupOptions: {
        output: {
          entryFileNames: `assets/[name]-[hash]-${assetVersion}.js`,
          chunkFileNames: `assets/[name]-[hash]-${assetVersion}.js`,
          assetFileNames: `assets/[name]-[hash]-${assetVersion}[extname]`,
        },
      },
    },
    server: {
      hmr: false,
      watch: null,
    },
  };
});
