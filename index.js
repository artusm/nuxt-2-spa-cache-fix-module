module.exports = function (moduleOptions) {
    const max = moduleOptions.max || 100

    this.nuxt.hook('render:resourcesLoaded', () => {
        try {
            const vueRenderer = this.nuxt.renderer
            if (!vueRenderer) return

            const origCreateRenderer = vueRenderer.createRenderer
            vueRenderer.createRenderer = function () {
                origCreateRenderer.call(this)
                try {
                    if (this.renderer.spa) {
                        const LRU = require('lru-cache')
                        this.renderer.spa.cache = new LRU({ max })
                    }
                } catch (err) {
                    console.warn('[nuxt-2-spa-cache-fix-module] Failed to patch SPA cache:', err.message)
                }
            }

            // Patch already created renderer (first load)
            if (vueRenderer.renderer.spa) {
                const LRU = require('lru-cache')
                vueRenderer.renderer.spa.cache = new LRU({ max })
            }
        } catch (err) {
            console.warn('[nuxt-2-spa-cache-fix-module] Failed to initialize:', err.message)
        }
    })
}
