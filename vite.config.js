import { defineConfig } from 'vite';
import cesium from 'vite-plugin-cesium';
export default defineConfig({
  plugins: [cesium()],
	css: { postcss: './postcss.config.js' },
});