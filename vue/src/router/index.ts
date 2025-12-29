import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

import HomeSite from '../views/HomeSite.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: HomeSite,
      meta: { requiresAuth: false },
    },
    {
      path: '/auth/signup',
      name: 'AuthSignup',
      component: () => import('../views/AuthSignupSite.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/auth/login',
      name: 'AuthLogin',
      component: () => import('../views/AuthLoginSite.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/auth/magic-login',
      name: 'AuthMagicLogin',
      component: () => import('../views/AuthMagicLoginSite.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/dives/list',
      name: 'DiveList',
      component: () => import('../views/DiveListSite.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/dives/create',
      name: 'DiveCreate',
      component: () => import('../views/DiveCreateSite.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/dives/upload',
      name: 'DiveUpload',
      component: () => import('../views/DiveUploadSite.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/dives/view/:diveId',
      name: 'DiveView',
      component: () => import('../views/DiveViewSite.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/dives/edit/:diveId',
      name: 'DiveEdit',
      component: () => import('../views/DiveEditSite.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/analytics/depth/:diveId',
      name: 'AnalyticsDepth',
      component: () => import('../views/AnalyticsDepthSite.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/analytics/segments/:diveId',
      name: 'AnalyticsSegments',
      component: () => import('../views/AnalyticsSegmentsSite.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/share/overview',
      name: 'ShareOverview',
      component: () => import('../views/ShareOverviewSite.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/share/:groupId/edit',
      name: 'GroupEdit',
      component: () => import('../views/GroupEditSite.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'Profile',
      component: () => import('../views/ProfileSite.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/user/email',
      name: 'UserEmail',
      component: () => import('../views/UserEmailSite.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/map/createView',
      name: 'MapCreateView',
      component: () => import('../views/MapCreateSite.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  const requiresAuth = to.matched.some((r) => r.meta?.requiresAuth)

  if (requiresAuth && !auth.isLoggedIn) {
    return { name: 'AuthLogin', query: { from: to.fullPath } }
  }
})

export default router
