import type { ApiOptions } from '~~/types/api'
import type { UserProfile, UserListParams, UserListResponse, User, CreateUserParams, UpdateUserParams } from '~~/types/user'

export const useUserApi = () => {
  const api = useApi()

  return {
    getProfile: (options?: ApiOptions) => 
      api.get<UserProfile>('/user/profile', undefined, options),

    getList: (params?: UserListParams, options?: ApiOptions) => 
      api.get<UserListResponse>('/users', params, options),

    getById: (id: number, options?: ApiOptions) => 
      api.get<User>(`/users/${id}`, undefined, options),

    create: (params: CreateUserParams, options?: ApiOptions) => 
      api.post<User>('/users', params, options),

    update: (id: number, params: UpdateUserParams, options?: ApiOptions) => 
      api.put<User>(`/users/${id}`, params, options),

    delete: (id: number, options?: ApiOptions) => 
      api.delete<void>(`/users/${id}`, options),

    batchDelete: (ids: number[], options?: ApiOptions) => 
      api.post<void>('/users/batch-delete', { ids }, options),
  }
}
