import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import TrackerView from './views/TrackerView.vue'

const routes = [
  { path: '/', component: HomeView },
  { path: '/:scheduleId', component: TrackerView, props: true },
]

export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
})
