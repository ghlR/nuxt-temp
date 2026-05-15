# Nuxt 4 通用请求封装方案使用指南

## 📁 项目结构

```
client/
├── app/
│   └── composables/
│       ├── useApi.ts          # 核心 API 封装（客户端 + SSR 通用）
│       └── usePageData.ts     # 统一数据获取入口（自动调度 SSR/ISR/CSR）
├── server/
│   ├── api/
│   │   └── [...path].ts       # 通用代理（自动处理缓存策略）
│   └── utils/
│       ├── isr.ts             # ISR 缓存工具
│       └── cache-policy.ts    # 缓存策略解析器
├── types/
│   └── api.ts                 # 通用类型定义
└── nuxt.config.ts             # 配置文件
```

## 🚀 快速开始

### 1. 基础 API 调用

```typescript
const api = useApi()

// GET 请求
const data = await api.get<UserProfile>('/user/profile')

// POST 请求
const result = await api.post<LoginResponse>('/auth/login', { username, password })

// PUT 请求
await api.put('/user/profile', { name: '新名字' })

// DELETE 请求
await api.delete('/user/delete')

// 文件上传
await api.upload('/upload', file)

// 文件下载
await api.download('/download/file.pdf', { filename: 'document.pdf' })
```

### 2. 页面级渲染策略

**只需两步：**

```vue
<script setup lang="ts">
// 第一步：声明渲染模式
definePageMeta({
  renderMode: 'ssr'  // 'ssr' | 'isr' | 'csr'
})

// 第二步：统一数据获取
const { data, pending, error, refresh } = usePageData(
  'unique-key',
  () => api.get<DataType>('/api/path')
)
</script>
```

## 📖 三种渲染模式

### SSR（服务端渲染）

**特点：** 每次请求都在服务端获取最新数据

**适用场景：** 个性化页面、实时数据、用户中心

```vue
<script setup lang="ts">
definePageMeta({
  renderMode: 'ssr'
})

interface UserProfile {
  id: number
  name: string
}

const api = useApi()

const { data, pending, error, refresh } = usePageData<UserProfile>(
  'ssr:user-profile',
  () => api.get<UserProfile>('/user/profile', undefined, { noCache: true }),
  { renderMode: 'ssr' }
)
</script>
```

### ISR（增量静态再生成）

**特点：** 服务端缓存，过期后后台刷新，用户始终快速响应

**适用场景：** 内容页、列表页、博客、商品详情

```vue
<script setup lang="ts">
definePageMeta({
  renderMode: 'isr',
  swr: 10,           // 10秒内缓存新鲜
  staleIfError: 300  // 容忍300秒旧数据
})

interface Article {
  id: number
  title: string
}

const api = useApi()

const { data, pending, error, refresh, refreshIfStale, isStale, cachedAt } = usePageData<Article>(
  'isr:article-123',
  () => api.get<Article>('/article/123', undefined, { swr: 10, staleIfError: 300 }),
  { renderMode: 'isr', swr: 10, staleIfError: 300 }
)

// 手动清除服务端缓存
const invalidateCache = async () => {
  await api.invalidateServerCache('/article/123')
  await refresh()
}
</script>
```

### CSR（客户端渲染）

**特点：** 纯客户端获取，服务端不渲染数据

**适用场景：** 登录页、交互型页面、不需要 SEO 的页面

```vue
<script setup lang="ts">
definePageMeta({
  renderMode: 'csr'
})

const api = useApi()
const data = ref(null)

onMounted(async () => {
  data.value = await api.get('/some-data')
})
</script>
```

## ⚙️ API 配置选项

```typescript
interface ApiOptions {
  // 基础配置
  silentError?: boolean      // 静默错误（不显示 Toast）
  timeout?: number           // 超时时间（毫秒），默认 30000
  
  // 重试配置
  retry?: number             // 重试次数
  retryDelay?: number        // 重试延迟（毫秒）
  retryCondition?: (error: ApiError) => boolean  // 自定义重试条件
  
  // 客户端缓存
  cache?: boolean            // 启用客户端缓存
  cacheTime?: number         // 缓存时间（毫秒）
  
  // 服务端缓存（ISR）
  swr?: number               // SWR 时间（秒）
  staleIfError?: number      // 容忍旧数据时间（秒）
  noCache?: boolean          // 禁用服务端缓存
}
```

### 使用示例

```typescript
const api = useApi()

// 超时控制
await api.get('/slow-api', undefined, { timeout: 5000 })

// 重试机制
await api.post('/unstable-api', data, { retry: 3, retryDelay: 1000 })

// 自定义重试条件
await api.get('/api', undefined, {
  retry: 2,
  retryCondition: (error) => error.status === 503 || error.isNetworkError
})

// 客户端缓存
await api.get('/static-data', undefined, { cache: true, cacheTime: 60000 })

// 服务端 ISR 缓存
await api.get('/article/123', undefined, { swr: 60, staleIfError: 300 })

// 禁用缓存（SSR 实时数据）
await api.get('/realtime-data', undefined, { noCache: true })

// 静默错误
await api.get('/optional-data', undefined, { silentError: true })
```

## 🔧 缓存管理

### 客户端缓存

```typescript
const api = useApi()

// 清除所有客户端缓存
api.clearCache()

// 清除特定缓存
api.clearCache('/user/profile')
```

### 服务端缓存

```typescript
const api = useApi()

// 清除服务端缓存
await api.invalidateServerCache('/user/profile')

// 清除多个缓存
await api.invalidateServerCache('/article')
```

## 📊 渲染模式对比

| 特性 | SSR | ISR | CSR |
|------|-----|-----|-----|
| 数据获取时机 | 服务端每次请求 | 服务端首次+后台刷新 | 客户端 onMounted |
| 首屏速度 | 中等 | **快** | 慢 |
| 数据实时性 | **实时** | 可配置延迟 | 实时 |
| 服务器压力 | 高 | **低** | 低 |
| SEO | **好** | **好** | 差 |
| 适用场景 | 个性化/实时页面 | 内容型/列表页 | 交互型/登录页 |

## 🏗️ 架构流程

```
┌─────────────────────────────────────────────────────────────────┐
│                         页面层                                   │
│  definePageMeta({ renderMode: 'ssr' | 'isr' | 'csr' })          │
│  usePageData('key', fetcher) → 自动调度                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
         ┌─────────┐   ┌─────────┐   ┌─────────┐
         │   SSR   │   │   ISR   │   │   CSR   │
         │ noCache │   │ swr+N   │   │ 客户端  │
         └────┬────┘   └────┬────┘   └────┬────┘
              │              │              │
              └──────────────┼──────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    server/api/[...path].ts                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  1. 解析缓存策略 (X-Cache-SWR / X-Cache-Stale-If-Error)     ││
│  │  2. GET 请求 → 检查 ISR 缓存                                 ││
│  │  3. 非 GET 请求 → 直接转发后端                               ││
│  │  4. DELETE + X-Cache-Invalidate → 清除缓存                  ││
│  └─────────────────────────────────────────────────────────────┘│
└────────────────────────────┬────────────────────────────────────┘
                             ▼
                    ┌────────────────┐
                    │    后端服务     │
                    └────────────────┘
```

## ⚠️ 注意事项

1. **ISR 缓存时间**：`swr` 和 `staleIfError` 需要在 `definePageMeta` 和 `usePageData` 中同时配置
2. **缓存 Key**：`usePageData` 的 key 必须全局唯一
3. **Token 管理**：`api.setToken()` 和 `api.clearToken()` 自动管理 Cookie
4. **错误处理**：使用 `try-catch` 或 `silentError` 选项处理错误

## 🎯 最佳实践

1. **页面级配置**：优先使用 `definePageMeta` 配置渲染模式
2. **类型安全**：为每个接口定义返回类型
3. **缓存策略**：根据数据更新频率选择合适的 `swr` 值
4. **错误边界**：使用 `silentError` 避免非关键接口报错影响用户体验
