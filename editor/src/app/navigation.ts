export interface NavigationItem {
  label: string
  route: string
  icon: string
  phase?: string
}

export interface NavigationGroup {
  label: string
  items: NavigationItem[]
}

export const navigationGroups: NavigationGroup[] = [
  {
    label: '概览',
    items: [{ label: '工作台', route: '/', icon: 'dashboard' }],
  },
  {
    label: '内容管理',
    items: [
      { label: '文档编辑', route: '/content/editor', icon: 'document' },
      { label: '图片资源', route: '/content/media', icon: 'media', phase: 'C' },
    ],
  },
  {
    label: '改动与版本',
    items: [
      { label: '当前改动', route: '/changes/workspace', icon: 'diff', phase: 'B' },
      { label: '提交记录', route: '/changes/commits', icon: 'history', phase: 'B' },
      { label: '审核任务', route: '/changes/reviews', icon: 'review', phase: 'B' },
    ],
  },
  {
    label: '预览与发布',
    items: [
      { label: '构建预览', route: '/releases/builds', icon: 'build', phase: 'D' },
      { label: '候选发布', route: '/releases/candidate', icon: 'candidate', phase: 'D' },
      { label: '线上发布', route: '/releases/production', icon: 'production', phase: 'E' },
      { label: '发布记录', route: '/releases/history', icon: 'release', phase: 'E' },
    ],
  },
  {
    label: '系统管理',
    items: [
      { label: '用户与权限', route: '/settings/users', icon: 'users', phase: 'E' },
      { label: '站点配置', route: '/settings/site', icon: 'settings', phase: 'E' },
      { label: '操作日志', route: '/settings/audit', icon: 'audit', phase: 'E' },
    ],
  },
]
