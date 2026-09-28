import { createRouter, createWebHistory } from 'vue-router'
import FlowEditorPage from '@/features/editor/FlowEditorPage.vue'
import FlowListPage from '@/features/FlowListPage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: FlowListPage },
    { path: '/flows/:flowId/versions/:version', component: FlowEditorPage },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
