import type { ApiOptions } from '~~/types/api'
import type { LoginParams, LoginResponse, UserInfo } from '~~/types/auth'

export const useAuthApi = () => {
  const api = useApi()

  return {
    login: (params: LoginParams, options?: ApiOptions) => 
      api.post<LoginResponse>('/auth/login', params, options),

    logout: (options?: ApiOptions) => 
      api.post<void>('/auth/logout', undefined, options),

    refreshToken: (refreshToken: string, options?: ApiOptions) => 
      api.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken }, options),

    getCurrentUser: (options?: ApiOptions) => 
      api.get<UserInfo>('/auth/me', undefined, options),

    updatePassword: (params: { oldPassword: string; newPassword: string }, options?: ApiOptions) => 
      api.post<void>('/auth/password', params, options),
  }
}
