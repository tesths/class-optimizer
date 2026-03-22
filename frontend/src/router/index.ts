import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getPersistedToken } from '@/utils/authPersistence'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/ClassListView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/class/:id',
    name: 'ClassDetail',
    component: () => import('@/views/ClassDetailView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/class/:id/edit',
    name: 'ClassEdit',
    component: () => import('@/views/ClassDetailView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/class/:classId/import',
    name: 'Import',
    component: () => import('@/views/ImportView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/class/:classId/garden',
    name: 'ClassGarden',
    component: () => import('@/views/ClassGardenView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/class/:classId/garden/group/:groupId',
    name: 'GroupGardenDetail',
    redirect: (to) => ({
      name: 'ClassGarden',
      params: { classId: to.params.classId },
      query: {
        tab: 'groups',
        highlightGroup: String(to.params.groupId || '')
      }
    }),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const authStore = useAuthStore()
  const persistedToken = authStore.token || getPersistedToken()

  if (!authStore.token && persistedToken) {
    authStore.token = persistedToken
  }

  if (to.meta.requiresAuth && !persistedToken) {
    return '/login'
  }

  if ((to.path === '/login' || to.path === '/register') && persistedToken) {
    return '/'
  }

  return true
})

export default router
