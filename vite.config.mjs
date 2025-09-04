import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const PORT = process.env.PORT || 3000;

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',       // مهم ليعمل على رابط Replit العام
    port: PORT,            // يستخدم المنفذ الذي توفره Replit
    allowedHosts: ['.repl.co', '.replit.dev'],
  }
});
