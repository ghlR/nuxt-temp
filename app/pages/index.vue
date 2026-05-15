<template>
  <div class="dashboard p-10">
    <h1 class="dashboard__title">个人中心</h1>
    <div v-if="loading">加载中...</div>
    <div v-else-if="userInfo">
      <p>姓名: {{ userInfo.name }}</p>
      <p>年龄: {{ userInfo.age }}</p>
    </div>
    
    <div class="mt-6 flex gap-2 flex-wrap">
      <button class="p-2 bg-blue-500 text-white" @click="fetchData">
        重新获取数据
      </button>
      
      <button class="p-2 bg-green-500 text-white" @click="testCache">
        测试客户端缓存
      </button>
      
      <button class="p-2 bg-red-500 text-white" @click="clearUserCache">
        清除客户端缓存
      </button>
    </div>

    <div class="mt-8 border-t pt-6">
      <h2 class="text-lg font-bold mb-4">渲染方案示例</h2>
      <div class="flex gap-4">
        <NuxtLink to="/ssr-example" class="p-2 bg-purple-500 text-white rounded">
          SSR 示例
        </NuxtLink>
        <NuxtLink to="/isr-example" class="p-2 bg-orange-500 text-white rounded">
          ISR 示例
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UserProfile } from '~~/types/user'

definePageMeta({
  renderMode: 'csr',
  middleware: 'auth'
})

const userApi = useUserApi()
const api = useApi()
const userInfo = ref<UserProfile | null>(null)
const loading = ref(false)

const fetchData = async () => {
  loading.value = true
  try {
    userInfo.value = await userApi.getProfile({ 
      noCache: true,
      retry: 1,
      timeout: 5000
    })
  } catch (e) {
    console.error('获取失败', e)
  } finally {
    loading.value = false
  }
}

const testCache = async () => {
  const start1 = performance.now()
  await userApi.getProfile({ cache: true, cacheTime: 60000 })
  console.log(`第一次请求耗时: ${(performance.now() - start1).toFixed(2)}ms`)
  
  const start2 = performance.now()
  await userApi.getProfile({ cache: true, cacheTime: 60000 })
  console.log(`第二次请求耗时: ${(performance.now() - start2).toFixed(2)}ms`)
}

const clearUserCache = () => {
  api.clearCache('/user/profile')
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped lang="scss">
.dashboard { 
  &__title {
    color: #375;
  }
}
</style>
