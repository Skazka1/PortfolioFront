import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { UserRole } from '@/types/api'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
    { path: '/forgot-password', name: 'forgot', component: () => import('@/views/ForgotPasswordView.vue') },
    { path: '/reset-password', name: 'reset', component: () => import('@/views/ResetPasswordView.vue') },
    {
      path: '/students',
      name: 'students',
      component: () => import('@/views/StudentsView.vue'),
      meta: { fullWidth: true },
    },
    {
      path: '/students/:id',
      name: 'student',
      component: () => import('@/views/StudentDetailView.vue'),
      meta: { fullWidth: true },
    },
    { path: '/projects/:id', name: 'project', component: () => import('@/views/ProjectDetailView.vue') },
    {
      path: '/events/:eventId/projects',
      name: 'event-projects',
      component: () => import('@/views/EventProjectsView.vue'),
      meta: { fullWidth: true },
    },
    { path: '/events', name: 'events', component: () => import('@/views/EventsView.vue') },
    {
      path: '/account',
      name: 'account',
      component: () => import('@/views/AccountView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/my-portfolio',
      name: 'my-portfolio',
      component: () => import('@/views/MyPortfolioView.vue'),
      meta: { requiresAuth: true, roles: ['student' satisfies UserRole], fullWidth: true },
    },
    {
      path: '/my-portfolio/new-project',
      name: 'project-builder-new',
      component: () => import('@/views/PortfolioProjectBuilderPageView.vue'),
      meta: { requiresAuth: true, roles: ['student' satisfies UserRole], fullWidth: true },
    },
    {
      path: '/my-portfolio/projects/:id/edit',
      name: 'project-builder-edit',
      component: () => import('@/views/PortfolioProjectBuilderPageView.vue'),
      meta: { requiresAuth: true, roles: ['student' satisfies UserRole], fullWidth: true },
    },

    {
      path: '/teacher/students',
      name: 'teacher-students',
      component: () => import('@/views/TeacherStudentsView.vue'),
      meta: { requiresAuth: true, roles: ['teacher' satisfies UserRole] },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.user) {
    await auth.fetchUser()
  }
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  const roles = to.meta.roles as UserRole[] | undefined
  if (roles && auth.user) {
    if (!roles.includes(auth.user.role)) {
      return { name: 'home' }
    }
  }
  return true
})

export default router
