import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  base: '/dance-tracker/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
