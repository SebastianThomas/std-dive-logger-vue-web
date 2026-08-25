import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: HomeView,
      meta: { requiresAuth: false },
    },
    {
      path: '/auth/signup',
      name: 'AuthSignup',
      component: () => import('../views/AuthSignupView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/auth/login',
      name: 'AuthLogin',
      component: () => import('../views/AuthLoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/auth/magic-login',
      name: 'AuthMagicLogin',
      component: () => import('../views/AuthMagicLoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/dives/list',
      name: 'DiveList',
      component: () => import('../views/DiveListView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/dives/create',
      name: 'DiveCreate',
      component: () => import('../views/DiveCreateView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/dives/view/:diveId',
      name: 'DiveView',
      component: () => import('../views/DiveView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/dives/edit/:diveId',
      name: 'DiveEdit',
      component: () => import('../views/DiveEditView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/dives/sites/:siteId',
      name: 'DiveSiteDetail',
      component: () => import('../views/DiveSiteDetailView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/gear/suits/:suitId',
      name: 'SuitDetail',
      component: () => import('../views/SuitDetailView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/gear/computers/:computerId',
      name: 'DiveComputerDetail',
      component: () => import('../views/DiveComputerDetailView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/gear/ccr-units/:ccrUnitId',
      name: 'CcrUnitDetail',
      component: () => import('../views/CcrUnitDetailView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/trips',
      name: 'TripList',
      component: () => import('../views/TripListView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/trips/:tripId',
      name: 'TripEdit',
      component: () => import('../views/TripEditView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/analytics',
      name: 'Analytics',
      component: () => import('../views/AnalyticsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/analytics/depth/:diveId',
      name: 'AnalyticsDepth',
      component: () => import('../views/AnalyticsDepthView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/analytics/segments/:diveId',
      name: 'AnalyticsSegments',
      component: () => import('../views/AnalyticsSegmentsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/share/overview',
      name: 'ShareOverview',
      component: () => import('../views/ShareOverviewView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/share/:groupId/edit',
      name: 'GroupEdit',
      component: () => import('../views/GroupEditView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'Profile',
      component: () => import('../views/ProfileView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/profile/equipment',
      name: 'ProfileEquipment',
      component: () => import('../views/ProfileEquipmentView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/profile/buddies',
      name: 'ProfileBuddies',
      component: () => import('../views/ProfileBuddiesView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/profile/certifications',
      name: 'ProfileCertifications',
      component: () => import('../views/ProfileCertificationsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/user/email',
      name: 'UserEmail',
      component: () => import('../views/UserEmailView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/dives/map',
      name: 'MapView',
      component: () => import('../views/MapView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/stats',
      name: 'Stats',
      component: () => import('../views/StatsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/stats/timeline',
      name: 'StatsTimeline',
      component: () => import('../views/StatsTimelineView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/tags',
      name: 'TagManager',
      component: () => import('../views/TagManagerView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/backfill',
      name: 'Backfill',
      component: () => import('../views/BackfillView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  const requiresAuth = to.matched.some((r) => r.meta?.requiresAuth)

  if (requiresAuth) {
    if (!auth.isInitialCheckDone) {
      await auth.waitForInitialCheck()
    }

    if (!auth.isLoggedIn) {
      return { name: 'AuthLogin', query: { from: to.fullPath } }
    }
  }
})

export default router
