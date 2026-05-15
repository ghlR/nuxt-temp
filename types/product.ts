export interface Product {
  id: number,
  name: string,
  price: number,
  description: string,
  image: string,
  category: string
}

export interface ProductListParams {
  page?: number,
  pageSize?: number,
  keyword?: string,
  category?: string
}

export interface ProductListResponse {
  list: Product[],
  total: number,
  page: number,
  pageSize: number
}