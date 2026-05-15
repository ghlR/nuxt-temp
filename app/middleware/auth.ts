export default defineNuxtRouteMiddleware((to) => {
  const token = useCookie('access_token')
  
  if (!token.value) {
    const redirectPath = to.fullPath
    return navigateTo(`/login?redirect=${encodeURIComponent(redirectPath)}`)
  }
})
