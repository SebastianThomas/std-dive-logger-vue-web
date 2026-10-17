import { useRouter, type RouteLocationRaw } from 'vue-router'

export function useNavigation() {
  const router = useRouter()

  /** `fallback`: where to go when the page was opened directly (no in-app history). */
  const safeBack = (fallback: RouteLocationRaw = { name: 'Home' }) => {
    // Check if there's a back history within the app
    // window.history.state.back will be null if there's no back history
    if (window.history.state?.back) {
      router.back()
    } else {
      router.push(fallback)
    }
  }

  const safeForward = () => {
    // Check if there's a forward history
    if (window.history.state?.forward) {
      router.forward()
    }
  }

  return {
    safeBack,
    safeForward,
    router,
  }
}
