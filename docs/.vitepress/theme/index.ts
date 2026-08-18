import DefaultTheme from 'vitepress/theme'
import DiagramPreview from 'vitepress-plugin-mermaid-diagram/DiagramPreview.vue'
import 'vitepress-plugin-mermaid-diagram/diagram-dark.css'
import './custom.css'
import DocImage from './components/DocImage.vue'
import HomeRouteTabs from './components/HomeRouteTabs.vue'
import Layout from './Layout.vue'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('DiagramPreview', DiagramPreview)
    app.component('DocImage', DocImage)
    app.component('HomeRouteTabs', HomeRouteTabs)
  },
}
