import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from "path";

// https://vite.dev/config/
// eslint-disable-next-line no-restricted-syntax
export default defineConfig(({ mode }) =>{
    const env = loadEnv(mode, process.cwd());

    return{
        plugins: [react()],
        server: {
            proxy: {
                '/api': {
                    target: `http://localhost:${env.BACEKND_PORT || 3000}`,
                    changeOrigin: true,
                    // rewrite: (path) => path.replace(/^\/api/, ''),
                },
            },
        },
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
            },
        },
    };
});
