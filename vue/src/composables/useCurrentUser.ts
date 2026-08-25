import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import { extractErrorDetail } from '@/lib/utils/apiErrors'
import { type User } from '@/lib/types/user'

// Small per-page fetch used by the profile subpages (Account/Equipment/Buddies/Certifications) -
// each is its own route and loads the current user independently rather than sharing state
// through a parent layout, so any of them works fine as a direct link/bookmark on its own.
export function useCurrentUser() {
  const { getWithToken } = useApi()
  const user = ref<User | null>(null)
  const loading = ref(true)

  const load = async () => {
    loading.value = true
    try {
      const res = await getWithToken<User>('/v1/users/')
      user.value = res.data
    } catch (err) {
      console.error(err)
      toast.error(`Failed to load user profile: ${extractErrorDetail(err)}`)
    } finally {
      loading.value = false
    }
  }

  return { user, loading, load }
}
