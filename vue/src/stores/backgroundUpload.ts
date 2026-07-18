import { defineStore } from 'pinia'
import { ref } from 'vue'

// Cross-component trigger for the hidden "upload custom background image" command-palette
// action. ProfileView watches `requestId` and opens its background-upload modal whenever it
// changes. App.vue watches `updatedId` (bumped after a successful upload/reset) to refetch the
// background it renders app-wide, since it's a separate, persistent component instance that
// wouldn't otherwise learn about the change.
export const useBackgroundUploadStore = defineStore('backgroundUpload', () => {
  const requestId = ref(0)
  const updatedId = ref(0)

  const requestOpen = () => {
    requestId.value++
  }

  const notifyUpdated = () => {
    updatedId.value++
  }

  return { requestId, updatedId, requestOpen, notifyUpdated }
})
