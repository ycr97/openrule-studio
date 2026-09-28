<script setup lang="ts">
import { Activity, ChevronDown, ChevronRight, CircleHelp, Database, FlaskConical, GitBranch, History, Layers3, Menu, Network, PlugZap, Search } from '@lucide/vue'
import { ref } from 'vue'
import { RouterLink, RouterView } from 'vue-router'

const sidebarOpen = ref(false)
const sections = [
  { name: '设计与配置', items: [
    { name: '决策流', icon: GitBranch, active: true },
    { name: '业务场景', icon: Network },
    { name: '事实字段', icon: Database },
    { name: '数据源', icon: PlugZap },
  ] },
  { name: '验证与运行', items: [
    { name: '试运行', icon: FlaskConical },
    { name: '发布中心', icon: Layers3 },
    { name: '执行追踪', icon: Activity },
  ] },
  { name: '工作空间', items: [{ name: '操作记录', icon: History }] },
]
</script>

<template>
  <div class="app-shell">
    <aside class="studio-sidebar" :class="{ 'is-open': sidebarOpen }" aria-label="工作台导航">
      <div class="sidebar-header">
        <RouterLink to="/" class="brand" @click="sidebarOpen = false">
          <img src="/favicon.svg" alt="" />
          <span class="brand-name">OpenRule<small>STUDIO</small></span>
        </RouterLink>
        <div class="workspace-chip">
          <span class="workspace-initial">O</span>
          <span><strong>决策工作空间</strong><small>Studio M1 · 本地联调</small></span>
        </div>
      </div>
      <nav class="sidebar-groups">
        <div v-for="section in sections" :key="section.name" class="sidebar-group">
          <p class="sidebar-label">{{ section.name }}</p>
          <template v-for="item in section.items" :key="item.name">
            <RouterLink v-if="item.active" to="/" class="studio-nav-item active" @click="sidebarOpen = false">
              <component :is="item.icon" :size="18" /><span>{{ item.name }}</span><small>1</small>
            </RouterLink>
            <span v-else class="studio-nav-item unavailable" :title="`${item.name}将在后续阶段接入`">
              <component :is="item.icon" :size="18" /><span>{{ item.name }}</span>
            </span>
          </template>
        </div>
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-help"><CircleHelp :size="16" />Flow 编辑 · 服务端执行</div>
        <div class="profile-button"><span class="avatar">O</span><span><strong>OpenRule Studio</strong><small>本地预览</small></span><ChevronDown :size="15" /></div>
      </div>
    </aside>
    <div v-if="sidebarOpen" class="sidebar-backdrop" @click="sidebarOpen = false" />
    <div class="studio-main">
      <header class="topbar">
        <button class="topbar-menu" type="button" aria-label="切换导航" @click="sidebarOpen = !sidebarOpen"><Menu :size="18" /></button>
        <span class="topbar-divider" />
        <span class="breadcrumb-root">工作空间</span><ChevronRight :size="13" /><strong>决策编排</strong>
        <span class="topbar-spacer" />
        <div class="global-search" aria-label="搜索将在后续阶段接入"><Search :size="15" /><span>搜索决策流、场景、字段</span><kbd>⌘ K</kbd></div>
        <span class="environment-label"><i />本地 API</span>
        <CircleHelp class="topbar-help" :size="17" />
      </header>
      <main class="app-content"><RouterView /></main>
    </div>
  </div>
</template>
