import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import DashboardPage from '../pages/DashboardPage.vue'
import DocumentEditorPage from '../pages/DocumentEditorPage.vue'
import PlannedPage from '../pages/PlannedPage.vue'

declare module 'vue-router' {
  interface RouteMeta {
    eyebrow?: string
    title?: string
    description?: string
    immersive?: boolean
  }
}

const plannedRoutes: RouteRecordRaw[] = [
  {
    path: '/content/media',
    name: 'media',
    component: PlannedPage,
    meta: { eyebrow: '内容管理', title: '图片资源', description: '统一浏览、上传、引用和插入文档图片。' },
    props: { phase: 'Phase C', capability: 'media' },
  },
  {
    path: '/changes/workspace',
    name: 'workspace-changes',
    component: PlannedPage,
    meta: { eyebrow: '改动与版本', title: '当前改动', description: '查看服务器草稿 diff，提交或安全撤销改动。' },
    props: { phase: 'Phase B', capability: 'changes' },
  },
  {
    path: '/changes/commits',
    name: 'commits',
    component: PlannedPage,
    meta: { eyebrow: '改动与版本', title: '提交记录', description: '按版本追踪文档、图片、构建和发布关系。' },
    props: { phase: 'Phase B', capability: 'commits' },
  },
  {
    path: '/changes/reviews',
    name: 'reviews',
    component: PlannedPage,
    meta: { eyebrow: '改动与版本', title: '审核任务', description: '基于 diff 和稳定预览完成内容审核。' },
    props: { phase: 'Phase B', capability: 'reviews' },
  },
  {
    path: '/releases/builds',
    name: 'builds',
    component: PlannedPage,
    meta: { eyebrow: '预览与发布', title: '构建预览', description: '管理 4175 稳定构建、release 与构建日志。' },
    props: { phase: 'Phase D', capability: 'builds' },
  },
  {
    path: '/releases/candidate',
    name: 'candidate',
    component: PlannedPage,
    meta: { eyebrow: '预览与发布', title: '候选发布', description: '部署并验收审核后的 Kooboo artifact。' },
    props: { phase: 'Phase D', capability: 'candidate' },
  },
  {
    path: '/releases/production',
    name: 'production',
    component: PlannedPage,
    meta: { eyebrow: '预览与发布', title: '线上发布', description: '只发布候选验收通过的确定 artifact commit。' },
    props: { phase: 'Phase E', capability: 'production' },
  },
  {
    path: '/releases/history',
    name: 'release-history',
    component: PlannedPage,
    meta: { eyebrow: '预览与发布', title: '发布记录', description: '保存部署回执、验收结果和环境基线。' },
    props: { phase: 'Phase E', capability: 'history' },
  },
  {
    path: '/settings/users',
    name: 'users',
    component: PlannedPage,
    meta: { eyebrow: '系统管理', title: '用户与权限', description: '使用独立身份区分编辑、审核和发布权限。' },
    props: { phase: 'Phase E', capability: 'users' },
  },
  {
    path: '/settings/site',
    name: 'site-settings',
    component: PlannedPage,
    meta: { eyebrow: '系统管理', title: '站点配置', description: '集中管理预览地址、分支和环境目标。' },
    props: { phase: 'Phase E', capability: 'settings' },
  },
  {
    path: '/settings/audit',
    name: 'audit',
    component: PlannedPage,
    meta: { eyebrow: '系统管理', title: '操作日志', description: '追踪编辑、构建、提交和发布操作。' },
    props: { phase: 'Phase E', capability: 'audit' },
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardPage,
      meta: { eyebrow: '概览', title: '工作台', description: '继续编辑并掌握草稿、预览和版本状态。' },
      beforeEnter: (to) => to.query.path
        ? { name: 'editor', query: { path: to.query.path } }
        : true,
    },
    {
      path: '/content/editor',
      name: 'editor',
      component: DocumentEditorPage,
      meta: { eyebrow: '内容管理', title: '文档编辑', description: '编辑 Markdown，并同时核对 4173 快速预览。', immersive: true },
    },
    ...plannedRoutes,
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
