import type { Configuration } from 'electron-builder'

import { author as _author, description, displayName, main, name, resources, version } from './package.json'

import { getDevFolder } from './src/lib/electron-app/release/utils/path'
console.log('App directory:', getDevFolder(main))
const author = _author?.name ?? _author
const currentYear = new Date().getFullYear()
const authorInKebabCase = author.replace(/\s+/g, '-')
const appId = `com.${authorInKebabCase}.${name}`.toLowerCase()

const artifactName = [`${name}-v${version}`, '-${os}.${ext}'].join('')

export default {
  appId,
  productName: displayName,
  copyright: `Copyright © ${currentYear} — ${author}`,

  publish: [
    {
      provider: 'github',
      owner: 'quang-tung-system-exe-com-vn',
      repo: 'svn-tool-electron',
      // releaseType: 'release',
    },
  ],

  directories: {
    app: getDevFolder(main),
    output: `dist/v${version}`,
  },

  mac: {
    artifactName,
    icon: `${resources}/build/icons/icon.ico`,
    category: 'public.app-category.utilities',
    target: ['zip', 'dmg', 'dir'],
  },

  linux: {
    artifactName,
    category: 'Utilities',
    synopsis: description,
    target: ['AppImage', 'deb', 'pacman', 'freebsd', 'rpm'],
  },

  win: {
    artifactName,
    icon: `${resources}/build/icons/icon.ico`,
    target: ['nsis'],
  },
} satisfies Configuration
