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
    label: '工作流',
    items: [{ label: '改动与发布', route: '/workflow', icon: 'workflow' }],
  },
  {
    label: '系统管理',
    items: [{ label: '平台设置', route: '/settings', icon: 'settings', phase: 'E' }],
  },
]
