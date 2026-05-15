<template>
  <div class="product p-10">
    <div v-if="pending">加载中...</div>
    <div v-else-if="product" class="product-info">
      <div class="product-name">产品名称：{{ product.name }}</div>
      <div class="product-price">产品价格: {{ product.price }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Product } from '~~/types/product'

definePageMeta({
  renderMode: 'ssr'
})

const productApi = useProductApi()
const route = useRoute()
const id = Number(route.params.id)

const { data: product, pending } = usePageData<Product>(
  `ssr:product-detail:${id}`,
  () => productApi.getDetail(id)
)
</script>

<style scoped>

</style>
