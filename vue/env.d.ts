/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL: string
  readonly VITE_AUTOCOMPLETE_URL: string
  readonly VITE_IMPORTER_URL: string
  readonly VITE_CARTO_API_KEY?: string
  readonly BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
