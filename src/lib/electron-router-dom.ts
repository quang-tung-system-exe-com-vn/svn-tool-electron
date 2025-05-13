import { createElectronRouter } from 'electron-router-dom'
// Tạo router
export const { Router, registerRoute, settings } = createElectronRouter({
  port: 4927,
  types: {
    ids: ['main', 'code-diff-viewer', 'show-log', 'check-coding-rules', 'spotbugs', 'commit-message-history', 'merge-svn'],
  },
})
