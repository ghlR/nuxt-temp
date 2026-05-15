<template>
  <div class="p-10">
    <h1>登录</h1>
    <input v-model="form.username" placeholder="用户名" class="border p-2 mb-2 block" >
    <input v-model="form.password" type="password" placeholder="密码" class="border p-2 mb-2 block" >
    <button :disabled="loading" class="p-2 bg-blue-500 text-white" @click="handleLogin">
      {{ loading ? '登录中...' : '登录' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { LoginParams } from '~~/types/auth'

definePageMeta({
  renderMode: 'csr'
})

const api = useApi()
const authApi = useAuthApi()
const router = useRouter()
const route = useRoute()
const form = ref<LoginParams>({ username: '', password: '' })
const loading = ref(false)

const handleLogin = async () => {
  loading.value = true
  try {
    const res = await authApi.login(form.value, {
      retry: 2,
      retryDelay: 1000
    })
    
    api.setToken(res.accessToken)
    useCookie('refresh_token').value = res.refreshToken
    
    const redirect = route.query.redirect as string
    router.push(redirect || '/')
  } catch (e) {
    console.error('登录失败', e)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>

</style>
