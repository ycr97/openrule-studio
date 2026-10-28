import { createRouter, createWebHistory } from 'vue-router'
import FlowEditorPage from '@/features/editor/FlowEditorPage.vue'
import FactCatalogPage from '@/features/facts/FactCatalogPage.vue'
import ProviderPage from '@/features/providers/ProviderPage.vue'
import FlowListPage from '@/features/FlowListPage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: FlowListPage },
    { path: '/facts', component: FactCatalogPage },
    { path: '/providers', component: ProviderPage },
    { path: '/flows/:flowId/versions/:version', component: FlowEditorPage },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
