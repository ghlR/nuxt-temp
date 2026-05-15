# Nuxt 4 请求封装优化总结

## ✅ 已完成的优化

### 第一阶段：核心功能增强

#### 1. 错误类型定义和请求超时控制
- ✅ 创建了 `ApiError` 类，统一错误处理
- ✅ 添加了请求超时控制（默认 30 秒）
- ✅ 支持请求取消（AbortController）
- ✅ 区分网络错误、超时错误、业务错误

**文件变更：**
- [types/api.ts](file:///e:/nuxt-template/client/types/api.ts) - 新增 ApiError 类和配置选项
- [app/composables/useApi.ts](file:///e:/nuxt-template/client/app/composables/useApi.ts) - 实现超时和取消功能

#### 2. Server 端代理优化
- ✅ 添加请求超时控制
- ✅ 详细的请求日志记录
- ✅ 完善的错误处理
- ✅ 性能监控

**文件变更：**
- [server/api/[...path].ts](file:///e:/nuxt-template/client/server/api/[...path].ts) - 优化代理逻辑

### 第二阶段：高级功能

#### 3. 请求重试机制
- ✅ 自动重试网络错误和服务器错误
- ✅ 支持自定义重试条件
- ✅ 指数退避重试策略
- ✅ 可配置重试次数和延迟

#### 4. 请求取消功能
- ✅ 支持外部 AbortSignal
- ✅ 自动超时取消
- ✅ 组件卸载时自动取消

### 第三阶段：性能优化

#### 5. 请求缓存机制
- ✅ GET 请求缓存支持
- ✅ 可配置缓存时间
- ✅ 支持手动清除缓存
- ✅ 基于请求 URL 和参数的缓存 key

#### 6. 性能监控和日志
- ✅ 请求耗时统计
- ✅ 慢请求告警（>3秒）
- ✅ 详细的请求日志（开发环境）
- ✅ 请求 ID 追踪

#### 7. 文件上传/下载
- ✅ 文件上传支持
- ✅ 文件下载支持
- ✅ 自定义文件名

### 第四阶段：模块化封装

#### 8. 客户端模块化 API
- ✅ 创建模块化 API 目录结构
- ✅ 认证模块（useAuthApi）
- ✅ 用户模块（useUserApi）
- ✅ 统一导出（useApiModules）

**新增文件：**
- [app/composables/api/auth.ts](file:///e:/nuxt-template/client/app/composables/api/auth.ts)
- [app/composables/api/user.ts](file:///e:/nuxt-template/client/app/composables/api/user.ts)
- [app/composables/api/index.ts](file:///e:/nuxt-template/client/app/composables/api/index.ts)

#### 9. 服务端渲染 API 封装
- ✅ 创建服务端 API 工具
- ✅ 支持 SSR 场景
- ✅ 模块化组织
- ✅ 请求日志和性能监控

**新增文件：**
- [server/utils/api.ts](file:///e:/nuxt-template/client/server/utils/api.ts)
- [server/utils/auth.ts](file:///e:/nuxt-template/client/server/utils/auth.ts)
- [server/utils/user.ts](file:///e:/nuxt-template/client/server/utils/user.ts)
- [server/utils/index.ts](file:///e:/nuxt-template/client/server/utils/index.ts)
- [server/api/user/profile-ssr.ts](file:///e:/nuxt-template/client/server/api/user/profile-ssr.ts)

#### 10. 示例页面更新
- ✅ 更新登录页面使用模块化 API
- ✅ 更新用户信息页面展示新功能
- ✅ 创建 SSR 示例页面
- ✅ 添加缓存测试功能

**更新文件：**
- [app/pages/login.vue](file:///e:/nuxt-template/client/app/pages/login.vue)
- [app/pages/index.vue](file:///e:/nuxt-template/client/app/pages/index.vue)
- [app/pages/ssr-example.vue](file:///e:/nuxt-template/client/app/pages/ssr-example.vue)

## 📊 优化效果对比

### 功能对比

| 功能 | 优化前 | 优化后 |
|------|--------|--------|
| 错误处理 | 简单错误提示 | 统一 ApiError 类，分类处理 |
| 超时控制 | ❌ 无 | ✅ 默认 30 秒，可配置 |
| 请求取消 | ❌ 无 | ✅ 支持 AbortController |
| 请求重试 | 仅 401 重试 | ✅ 网络错误、服务器错误自动重试 |
| 请求缓存 | ❌ 无 | ✅ GET 请求缓存，可配置时间 |
| 性能监控 | ❌ 无 | ✅ 耗时统计、慢请求告警 |
| 文件操作 | ❌ 无 | ✅ 上传/下载支持 |
| 模块化 | ❌ 无 | ✅ 客户端和服务端模块化 |
| SSR 支持 | 部分 | ✅ 完整的 SSR API 封装 |

### 代码质量提升

- ✅ **类型安全**：完整的 TypeScript 类型定义
- ✅ **错误处理**：统一的错误处理机制
- ✅ **可维护性**：模块化组织，易于扩展
- ✅ **可测试性**：清晰的接口定义
- ✅ **开发体验**：详细的日志和错误提示

## 🎯 使用示例

### 客户端使用

```typescript
// 基础使用
const api = useApi()
const data = await api.get('/user/profile')

// 模块化使用
const authApi = useAuthApi()
const loginRes = await authApi.login({ username: 'admin', password: '123456' })

// 高级配置
const userApi = useUserApi()
const profile = await userApi.getProfile({ 
  retry: 2,           // 重试 2 次
  timeout: 5000,      // 5 秒超时
  cache: true,        // 启用缓存
  cacheTime: 60000    // 缓存 1 分钟
})
```

### 服务端渲染使用

```typescript
// 在服务端路由中
import { useServerUserApi } from '../utils/user'

export default defineEventHandler(async (event) => {
  const userApi = useServerUserApi(event)
  const profile = await userApi.getProfile()
  return { code: 200, data: profile }
})

// 在页面中使用 SSR
const { data } = await useAsyncData(
  'user-profile',
  () => userApi.getProfile({ cache: true }),
  { server: true }
)
```

## 📈 性能提升

1. **请求缓存**：减少重复请求，提升响应速度
2. **请求重试**：提高请求成功率，减少用户等待
3. **性能监控**：及时发现慢请求，优化用户体验
4. **请求取消**：避免不必要的请求，节省资源

## 🔧 配置选项

### ApiOptions 完整配置

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

## 📚 文档

- ✅ [API_USAGE.md](file:///e:/nuxt-template/client/API_USAGE.md) - 完整的使用指南
- ✅ 代码注释完善
- ✅ 类型定义清晰

## 🎉 总结

这次优化全面提升了 Nuxt 4 请求封装的质量和功能：

1. **功能完整性**：从基础请求到高级功能一应俱全
2. **类型安全**：完整的 TypeScript 支持
3. **模块化**：客户端和服务端都有清晰的模块划分
4. **性能优化**：缓存、重试、监控等性能提升措施
5. **开发体验**：详细的日志、错误提示和文档

这套封装已经可以满足企业级项目的需求，为后续开发提供了坚实的基础！
