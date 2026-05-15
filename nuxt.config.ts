export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@nuxt/ui', '@formkit/auto-animate/nuxt'],
  css: ['~/assets/style/main.css'],
  sourcemap: false,
  imports: {
    dirs: [
      'composables',
      'composables/api'
    ]
  },
  runtimeConfig: {
    apiBase: process.env.API_BASE_URL || 'http://localhost:8080',
    public: {
      baseApi: '/api'
    }
  },
  routeRules: {
    '/': { ssr: true },
  },
  nitro: {
    storage: {
      isr: {
        driver: 'memory',
        max: 1000
      }
    },
    devStorage: {
      isr: {
        driver: 'memory'
      },
      cache: {
        driver: 'memory'
      }
    }
  },
})
