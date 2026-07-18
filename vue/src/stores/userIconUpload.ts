import { defineStore } from 'pinia'
import { ref } from 'vue'

// Cross-component trigger for the hidden "upload custom dive-site icon" command-palette action.
// ProfileView watches `requestId` and opens its icon-upload modal whenever it changes.
export const useUserIconUploadStore = defineStore('userIconUpload', () => {
  const requestId = ref(0)

  const requestOpen = () => {
    requestId.value++
  }

  return { requestId, requestOpen }
})
