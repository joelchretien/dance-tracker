import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import { execSync } from 'child_process'

const gitHash = execSync('git rev-parse --short HEAD').toString().trim()

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  base: '/dance-tracker/',
  define: {
    __GIT_HASH__: JSON.stringify(gitHash),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
