/**
 * Production build: entry JS/CSS için preload/modulepreload enjekte eder.
 */
export function coldStartHtmlPlugin() {
  return {
    name: 'cold-start-html',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!ctx.bundle) return []

        const tags = []
        let entryJs = null
        let entryCss = null

        for (const item of Object.values(ctx.bundle)) {
          if (item.type === 'chunk' && item.isEntry) {
            entryJs = item.fileName
          }
          if (item.type === 'asset' && item.fileName.endsWith('.css')) {
            entryCss = item.fileName
          }
        }

        if (entryJs) {
          tags.push({
            tag: 'link',
            injectTo: 'head-prepend',
            attrs: {
              rel: 'modulepreload',
              href: `/${entryJs}`,
              crossorigin: true,
            },
          })
        }

        if (entryCss) {
          tags.push({
            tag: 'link',
            injectTo: 'head-prepend',
            attrs: {
              rel: 'preload',
              href: `/${entryCss}`,
              as: 'style',
              crossorigin: true,
            },
          })
        }

        return tags
      },
    },
  }
}
