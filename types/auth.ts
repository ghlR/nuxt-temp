export interface LoginParams {
  username: string
  password: string
}
export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: UserInfo
}

export interface UserInfo {
  id: number
  username: string
  email: string
  avatar?: string
  role: string
}