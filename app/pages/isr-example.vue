<template>
  <div class="p-10">
    <h1>ISR 示例页面</h1>
    <p class="text-sm text-gray-500 mb-4">
      ISR（增量静态再生成）：页面在服务端缓存，过期后后台重新生成，用户始终拿到快速响应
    </p>

    <div v-if="pending">加载中...</div>
    <div v-else-if="error" class="text-red-500">加载失败: {{ error.message }}</div>
    <div v-else-if="profile">
      <div class="bg-gray-100 p-4 rounded-lg">
        <p>姓名: {{ profile.name }}</p>
        <p>年龄: {{ profile.age }}</p>
      </div>
      
      <div class="mt-4 text-sm text-gray-500">
        <p>渲染模式: {{ renderMode }}</p>
        <p>缓存时间: {{ cachedAt || '未缓存' }}</p>
        <p>数据状态: {{ isStale ? '已过期（后台重新验证中）' : '新鲜' }}</p>
      </div>
    </div>

    <div class="mt-6 flex gap-2">
      <button class="p-2 bg-blue-500 text-white" @click="handleRefreshIfStale">
        智能刷新（仅在过期时）
      </button>
      <button class="p-2 bg-green-500 text-white" @click="handleRefresh">
        强制刷新
      </button>
      <button class="p-2 bg-red-500 text-white" @click="invalidateCache">
        清除服务端缓存
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UserProfile } from '~~/types/user'

definePageMeta({
  renderMode: 'isr',
  swr: 10,
  staleIfError: 300,
  middleware: 'auth'
})

const userApi = useUserApi()
const api = useApi()

const { data: profile, pending, error, refresh, refreshIfStale, isStale, cachedAt, renderMode } = usePageData<UserProfile>(
  'isr:user-profile',
  () => userApi.getProfile({ silentError: true, swr: 10, staleIfError: 300 }),
  { renderMode: 'isr', swr: 10, staleIfError: 300 }
)

const handleRefreshIfStale = () => {
  refreshIfStale()
}

const handleRefresh = async () => {
  await refresh()
}

const invalidateCache = async () => {
  await api.invalidateServerCache('/user/profile')
  await refresh()
}

useHead({
  title: 'ISR 示例页面'
})
</script>

<style scoped>

</style>
