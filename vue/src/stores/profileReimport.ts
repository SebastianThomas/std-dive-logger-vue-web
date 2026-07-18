import { defineStore } from 'pinia'
import { ref } from 'vue'

// Cross-component trigger for the hidden "reimport profile" command-palette action.
// DiveView watches `requestId` and opens its reimport modal whenever it changes.
export const useProfileReimportStore = defineStore('profileReimport', () => {
  const requestId = ref(0)

  const requestOpen = () => {
    requestId.value++
  }

  return { requestId, requestOpen }
})
