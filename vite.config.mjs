// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// تأكد أن هذا المتغير ليس ضروريًا في هذا الملف، حيث أن Vite يقوم بتعيينه تلقائيًا
// const PORT = process.env.PORT || 3000

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: process.env.PORT || 3000,
    // هذا السطر هو الحل لمشكلة "Blocked request"
    allowedHosts: [
      '923d31db-62ba-4b40-93ae-34d9f25e7d1a-00-33iew8wl8t2w5.kirk.replit.dev'
    ]
  }
})