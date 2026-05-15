import type { ApiOptions } from '~~/types/api'
import type { Product, ProductListParams, ProductListResponse } from '~~/types/product'

export type { Product, ProductListParams, ProductListResponse }

export const useProductApi = () => {
  const api = useApi()

  return {
    getDetail: (id: number, options?: ApiOptions) => 
      api.get<Product>(`/product/${id}`, undefined, options),

    getList: (params?: ProductListParams, options?: ApiOptions) => 
      api.get<ProductListResponse>('/product/list', params, options)
  }
}
