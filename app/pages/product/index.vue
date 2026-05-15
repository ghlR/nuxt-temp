<template>
  <div class="list">
    <div v-if="pending">加载中...</div>
    <div v-else-if="data?.list">
      <div v-for="(item) in data.list" :key="item.id" @click="handlePushDetail(item.id)">
        <div class="product">
          <div class="product-info">
            <div class="product-name">{{ item.name }}</div>
            <div class="product-price">{{ item.price }}</div>
            <div class="product-description">{{ item.description }}</div>
          </div>
        </div>
      </div>
    </div>
    
  </div>
</template>

<script setup lang="ts">
import type { ProductListResponse } from '~~/types/product'

definePageMeta({
  renderMode: 'isr',
  swr: 10,
  staleIfError: 300
})

const router = useRouter()
const productApi = useProductApi()

const { data, pending } = usePageData<ProductListResponse>(
  'isr:product-list',
  () => productApi.getList({
    page: 1,
    pageSize: 1,
  }),
  { renderMode: 'isr', swr: 10, staleIfError: 300 }
)

function handlePushDetail(id: number) {
  router.push(`/product/${id}`)
}
</script>

<style scoped>

</style>
