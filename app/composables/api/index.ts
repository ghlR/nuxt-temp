import type { ApiOptions } from '~~/types/api'

type ApiModule = Record<string, (options?: ApiOptions) => Promise<any>>

export const createApiModule = <T extends ApiModule>(module: T): T => {
  return module
}
