import { useRouter } from 'vue-router'

export function useNavigation() {
  const router = useRouter()

  const safeBack = () => {
    // Check if there's a back history within the app
    // window.history.state.back will be null if there's no back history
    if (window.history.state?.back) {
      router.back()
    } else {
      // No in-app history, go to home instead
      router.push({ name: 'Home' })
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
