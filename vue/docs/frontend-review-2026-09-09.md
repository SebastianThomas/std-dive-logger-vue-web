# Frontend review — 9 September 2026

## Scope and evidence

Repository-wide source inventory and pattern review (204 production source files at the start), full ESLint/type/build checks, and the full frontend test suite. Deeper manual tracing covered App/router/auth, homepage loading, dive-list filtering/pagination/search, site suggestions and all map components, shared autocomplete, persistent view state, offline caches, and asynchronous view loading. Graph/statistics, edit/import/share and equipment flows were inspected for request lifecycle, routing, DOM sinks, event cleanup and caching patterns; this is not a claim that every calculation or workflow has been manually exercised.

Existing staged authentication/cache changes from the previous review were preserved. No deployment, backend mutation, real-account browser testing or destructive data operation was performed. Browser verification used synthetic coordinates and sites.

## Fixed in this pass

| Priority | Finding and trigger | Resolution |
| --- | --- | --- |
| P1 | Suggested-site icons reuse classes scoped only to DiveSiteMap, leaving marker contents without dimensions on SuggestionsMap. | Moved marker styles into a shared stylesheet imported with the icon factory. Top picks have visible gold star markers, accessible titles and higher stacking order. |
| P1 | Map fitting passes LatLngBounds objects between distinct Leaflet module instances; the suggestion map stays at its initial wide zoom. | Pass plain coordinate arrays; fit on the map's ready event. Applied the same correction to search-results maps. Verified in a browser. |
| P2 | A distant suggestion zooms the local map out to a continent/world view. | Fit all results plus location when computed zoom is at least 7. Otherwise keep location (or first top pick without location), prioritize top picks that fit, then nearby results. Show the excluded-site count and an explicit Show all/Focus nearby toggle. All valid markers remain on the map. |
| P2 | Rapid distance changes can let an older geolocation/API request overwrite newer suggestions. | Abort superseded requests and guard completion, errors and loading state. |
| P1 | App's logout latch is never reset; after login/logout/login, another logout is ignored. An unbounded network request can also delay local logout indefinitely. | Reset the latch and bound the logout request to ten seconds. |
| P2 | Shared autocomplete invalidates old requests only when a new network request starts. Clearing/resetting or serving a cached result lets late responses reopen stale results. | Invalidate immediately on input/reset and on every lookup, including cache hits. Dispose pending debounce work with the component scope. |
| P2 | Dive-list requests and search timers continue after replacement/navigation. Home requests also continue after unmount. | Abort superseded/unmounted requests; cancel the list debounce; ignore canceled completions. |
| P2 | Updating dive-list URL parameters drops computerId. Reloading/bookmarking the resulting URL loses the computer filter. | Preserve computerId in query serialization. |
| P2 | Main-map state uses logical OR, so valid latitude/longitude/zoom zero is discarded. | Use nullish fallback. |
| P2 | Offline app precache excludes the SVG used by ordinary site markers. | Explicitly include leaflet/diver-trim.svg. |

## Remaining findings, in priority order

1. **P1 — list filters can silently be ignored.** `src/views/DiveListView.vue`, `fetchDives`: most filters use mutually exclusive branches. Search takes precedence over suit/computer/tags; site/base-configuration alone do not select the filtered endpoint; a single date bound is not sufficient either. The combined backend endpoint currently has no computer/shared-read parameters. Define consistent AND semantics and either extend that contract or make unsupported combinations unavailable. Test combinations, partial dates and shared lists before changing endpoint selection.
2. **P2 — route query navigation is not synchronized back into list state.** `DiveListView.vue` initializes refs from route.query once and only writes state back. Browser Back/Forward or same-route navigation to another filtered URL can leave visible rows inconsistent with the URL. Use a validated query parser and bidirectional synchronization with one fetch owner; cover page/sort enum validation too.
3. **P2 — several other searches/statistics still have response races.** `src/views/StatsTimelineView.vue:fetchSeries` and `src/components/DiveSiteSearch.vue:fetchResults/suggestNow` assign results without request identity or cancellation. Resolve two deferred responses in reverse order to reproduce. Apply the same latest-request discipline used in this pass, including reset/selection/unmount.
4. **P2 — reused detail routes can display the previous entity.** `SuitDetailView.vue`, `CcrUnitDetailView.vue` and `DiveComputerDetailView.vue` load onMounted but do not watch their ID parameters. Add parameter watchers (with cancellation) rather than globally remounting every route, which would discard useful graph state.
5. **P2 — main map failures appear as an empty map.** `src/views/MapView.vue` only logs loading errors. Add loading/error/retry states to distinguish no sites from an unavailable server.
6. **P2 — test runner shares native Node localStorage between workers.** `package.json:test:ci` uses one /tmp SQLite storage file. Parallel execution reproduced `database is locked`; running one worker passed. Prefer isolated per-test-environment storage, with a regression proving storage tests do not leak between workers. Plain vitest without the configured storage option also fails on this Node version.
7. **P3 — avoid repeated current-user fetches.** App background, dive list ownership, and each DiveSiteMap fetch `/v1/users/` separately. Consider a session-scoped user store with in-flight deduplication and invalidation after profile edits/logout. Do not cache user data globally across accounts.
8. **P3 — persisted map state is only shape-checked.** `src/composables/mapViewState.ts` accepts out-of-range coordinates/zoom and leaves a pending storage-write timer on scope disposal. Validate finite geographic ranges and bound zoom; dispose the timer.

## Validation and practical limits

- 65 test files / 482 tests passed with `npm run test:ci -- --maxWorkers=1` in about 20 seconds. New tests cover nearby/distant/no-location/invalid/zero-coordinate framing and autocomplete reset/cache races.
- Full frontend TypeScript check and ESLint passed. Production build verified separately.
- Browser: ordinary markers and gold top picks are visible; local framing includes the synthetic current location; one far-away site is called out; Show all includes it. Checked standard and narrow 320px container layouts. This is not full mobile-device emulation.
- No full backend build/test run was needed. Remaining findings above were not silently rolled into large feature or API changes.
