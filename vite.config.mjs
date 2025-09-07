// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// تأكد أن هذا المتغير ليس ضروريًا في هذا الملف، حيث أن Vite يقوم بتعيينه تلقائيًا
// const PORT = process.env.PORT || 3000

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true
  }
})