import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    fullWidth?: boolean
    requiresAuth?: boolean
    roles?: ('admin' | 'teacher' | 'student')[]
  }
}
