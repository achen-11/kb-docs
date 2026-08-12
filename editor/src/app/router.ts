import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import DashboardPage from '../pages/DashboardPage.vue'
import DocumentEditorPage from '../pages/DocumentEditorPage.vue'
import PlannedPage from '../pages/PlannedPage.vue'
import WorkflowPage from '../pages/WorkflowPage.vue'

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

const workflowAliases = [
  '/changes/workspace', '/changes/commits', '/changes/reviews',
  '/releases/builds', '/releases/candidate', '/releases/production', '/releases/history',
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
    {
      path: '/workflow',
      name: 'workflow',
      component: WorkflowPage,
      meta: { eyebrow: '改动与发布', title: '从草稿到发布', description: '按维护人员真正需要的顺序，检查改动、提交版本并确认预览状态。' },
    },
    ...workflowAliases.map((path) => ({ path, redirect: '/workflow' })),
    {
      path: '/settings',
      name: 'settings',
      component: PlannedPage,
      meta: { eyebrow: '系统管理', title: '平台设置', description: '集中管理用户权限、站点配置与操作日志。' },
      props: { phase: 'Phase E', capability: 'settings' },
    },
    ...plannedRoutes,
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
