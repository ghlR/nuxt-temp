# API 封装使用指南

## 📁 项目结构

```
client/
├── app/
│   ├── composables/
│   │   ├── useApi.ts          # 核心 API 封装
│   │   └── api/               # 模块化 API
│   │       ├── auth.ts        # 认证模块
│   │       ├── user.ts        # 用户模块
│   │       └── index.ts       # 统一导出
│   └── pages/
│       ├── login.vue          # 登录示例
│       ├── index.vue          # 用户信息示例
│       └── ssr-example.vue    # SSR 示例
├── server/
│   ├── api/
│   │   ├── [...path].ts       # 通用代理
│   │   └── user/
│   │       └── profile-ssr.ts # SSR API 示例
│   └── utils/                 # 服务端 API 工具
│       ├── api.ts             # 核心 SSR API
│       ├── auth.ts            # 认证模块
│       ├── user.ts            # 用户模块
│       └── index.ts           # 统一导出
└── types/
    └── api.ts                 # 类型定义
```

## 🚀 快速开始

### 客户端使用

#### 1. 基础使用

```typescript
const api = useApi()

// GET 请求
const data = await api.get('/user/profile')

// POST 请求
const result = await api.post('/auth/login', { username: 'admin', password: '123456' })

// PUT 请求
await api.put('/user/profile', { name: '新名字' })

// DELETE 请求
await api.delete('/user/delete')
```

#### 2. 模块化 API 使用

```typescript
// 使用认证模块
const authApi = useAuthApi()
const loginRes = await authApi.login({ username: 'admin', password: '123456' })

// 使用用户模块
const userApi = useUserApi()
const profile = await userApi.getProfile()

// 统一使用所有模块
const apiModules = useApiModules()
const profile = await apiModules.user.getProfile()
```

#### 3. 高级配置

```typescript
const api = useApi()

// 请求超时控制
await api.get('/user/profile', undefined, { timeout: 5000 })

// 请求重试
await api.post('/auth/login', data, { 
  retry: 3, 
  retryDelay: 1000 
})

// 请求缓存（仅 GET 请求）
await api.get('/user/profile', undefined, { 
  cache: true, 
  cacheTime: 60000 
})

// 静默错误（不显示 Toast）
await api.get('/user/profile', undefined, { silentError: true })

// 自定义重试条件
await api.get('/user/profile', undefined, {
  retry: 2,
  retryCondition: (error) => {
    return error.isNetworkError || error.status === 503
  }
})

// 请求取消
const controller = new AbortController()
setTimeout(() => controller.abort(), 1000)
await api.get('/user/profile', undefined, { signal: controller.signal })
```

#### 4. 文件上传/下载

```typescript
const api = useApi()

// 文件上传
const file = new File(['content'], 'example.txt')
const uploadResult = await api.upload('/upload', file)

// 文件下载
await api.download('/download/file.pdf', { filename: 'document.pdf' })
```

#### 5. 缓存管理

```typescript
const api = useApi()

// 清除所有缓存
api.clearCache()

// 清除特定模块的缓存
api.clearCache('/user')
```

### 服务端渲染使用

#### 1. 在服务端路由中使用

```typescript
import { defineEventHandler } from '#imports'
import { useServerUserApi } from '~/server/utils/user'

export default defineEventHandler(async (event) => {
  const userApi = useServerUserApi(event)
  const profile = await userApi.getProfile()
  
  return {
    code: 200,
    message: 'success',
    data: profile
  }
})
```

#### 2. 在页面中使用 SSR

```vue
<template>
  <div>
    <div v-if="pending">加载中...</div>
    <div v-else-if="data">{{ data.name }}</div>
  </div>
</template>

<script setup lang="ts">
const { data, pending, error } = await useAsyncData(
  'user-profile',
  async () => {
    const userApi = useUserApi()
    return await userApi.getProfile({ cache: true })
  },
  { server: true }
)
</script>
```

## 🎯 核心特性

### 1. 请求超时控制
- 默认超时时间：30 秒
- 可自定义超时时间
- 支持请求取消

### 2. 请求重试机制
- 自动重试网络错误和服务器错误
- 支持自定义重试条件
- 指数退避重试策略

### 3. 请求缓存
- GET 请求缓存支持
- 可配置缓存时间
- 支持手动清除缓存

### 4. 错误处理
- 统一的 ApiError 错误类
- 区分网络错误、超时错误、业务错误
- 自动 Toast 提示

### 5. 性能监控
- 请求耗时统计
- 慢请求告警（>3秒）
- 详细的请求日志

### 6. Token 管理
- 自动 Token 刷新
- 请求队列管理
- Token 过期自动重试

## 📝 最佳实践

### 1. 模块化组织

为每个业务模块创建独立的 API 文件：

```typescript
// composables/api/product.ts
export const useProductApi = () => {
  const api = useApi()
  
  return {
    getList: (params?: any) => api.get('/products', params),
    getDetail: (id: number) => api.get(`/products/${id}`),
    create: (data: any) => api.post('/products', data),
    update: (id: number, data: any) => api.put(`/products/${id}`, data),
    delete: (id: number) => api.delete(`/products/${id}`)
  }
}
```

### 2. 类型安全

为每个接口定义类型：

```typescript
// types/api.ts
export interface Product {
  id: number
  name: string
  price: number
}

export interface ProductListParams {
  page?: number
  pageSize?: number
  category?: string
}

// composables/api/product.ts
export const useProductApi = () => {
  const api = useApi()
  
  return {
    getList: (params?: ProductListParams) => 
      api.get<Product[]>('/products', params),
    getDetail: (id: number) => 
      api.get<Product>(`/products/${id}`)
  }
}
```

### 3. 错误处理

```typescript
try {
  const profile = await userApi.getProfile()
} catch (error) {
  if (error instanceof ApiError) {
    if (error.isNetworkError) {
      console.error('网络错误')
    } else if (error.isTimeout) {
      console.error('请求超时')
    } else {
      console.error('业务错误:', error.message)
    }
  }
}
```

### 4. SSR 优化

```typescript
// 使用 useAsyncData 进行 SSR
const { data } = await useAsyncData(
  'unique-key',
  () => userApi.getProfile({ cache: true }),
  { 
    server: true,  // 服务端渲染
    lazy: false    // 阻塞渲染
  }
)
```

## 🔧 配置选项

### ApiOptions 接口

```typescript
interface ApiOptions {
  showLoading?: boolean           // 显示全局 loading
  silentError?: boolean           // 静默错误
  onError?: (error: unknown) => void  // 自定义错误处理
  timeout?: number                // 超时时间（毫秒）
  signal?: AbortSignal            // 请求取消信号
  retry?: number                  // 重试次数
  retryDelay?: number             // 重试延迟（毫秒）
  retryCondition?: (error: ApiError) => boolean  // 重试条件
  cache?: boolean                 // 是否缓存
  cacheTime?: number              // 缓存时间（毫秒）
}
```

## 🎉 总结

这套 API 封装提供了：
- ✅ 完整的请求生命周期管理
- ✅ 模块化的 API 组织
- ✅ 强大的错误处理
- ✅ 性能监控和优化
- ✅ 服务端渲染支持
- ✅ TypeScript 类型安全

让你的 Nuxt 4 项目开发更加高效和可靠！
