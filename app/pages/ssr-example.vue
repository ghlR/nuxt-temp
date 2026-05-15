<template>
  <div class="p-10">
    <h1>SSR 示例页面</h1>
    <p class="text-sm text-gray-500 mb-4">
      SSR（服务端渲染）：每次请求都在服务端获取数据，页面内容实时更新，适合个性化/实时性要求高的场景
    </p>

    <div v-if="pending">加载中...</div>
    <div v-else-if="error" class="text-red-500">加载失败: {{ error.message }}</div>
    <div v-else-if="profile">
      <div class="bg-gray-100 p-4 rounded-lg">
        <p>姓名: {{ profile.name }}</p>
        <p>年龄: {{ profile.age }}</p>
      </div>
      <p class="text-sm text-gray-500 mt-2">
        渲染模式: {{ renderMode }} | 此数据在服务端渲染时获取
      </p>
    </div>

    <button class="mt-4 p-2 bg-blue-500 text-white" @click="handleRefresh">
      重新获取
    </button>
  </div>
</template>

<script setup lang="ts">
import type { UserProfile } from '~~/types/user'

definePageMeta({
  renderMode: 'ssr',
  middleware: 'auth'
})

const userApi = useUserApi()

const { data: profile, pending, error, refresh, renderMode } = usePageData<UserProfile>(
  'ssr:user-profile',
  () => userApi.getProfile({ silentError: true, noCache: true }),
  { renderMode: 'ssr' }
)

const handleRefresh = async () => {
  await refresh()
}

useHead({
  title: 'SSR 示例页面'
})
</script>

<style scoped>

</style>
