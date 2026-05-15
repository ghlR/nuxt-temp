export interface User {
  id: number
  username: string
  email: string
  avatar?: string
  status: number
  createdAt: string
}

export interface UserListParams {
  page?: number
  pageSize?: number
  keyword?: string
  status?: number
}

export interface UserListResponse {
  list: User[]
  total: number
  page: number
  pageSize: number
}

export interface CreateUserParams {
  username: string
  email: string
  password: string
  avatar?: string
}

export interface UpdateUserParams {
  username?: string
  email?: string
  avatar?: string
  status?: number
}

export interface UserProfile {
  id: number
  name: string
  age: number
}