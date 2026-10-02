import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({ base: command === 'build' ? '/static/dr-xai/' : '/', build: { outDir: 'static/dr-xai', emptyOutDir: true }, plugins: [react()], server: { proxy: { '/api': 'http://127.0.0.1:5001', '/static': 'http://127.0.0.1:5001' } }, preview: { proxy: { '/api': 'http://127.0.0.1:5001', '/static/uploaded_images': 'http://127.0.0.1:5001' } } }));
