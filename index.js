module.exports = function (moduleOptions) {
    const max = moduleOptions.max || 100

    this.nuxt.hook('render:resourcesLoaded', () => {
        const vueRenderer = this.nuxt.renderer
        if (!vueRenderer) return

        const origCreateRenderer = vueRenderer.createRenderer
        vueRenderer.createRenderer = function () {
            origCreateRenderer.call(this)
            if (this.renderer.spa) {
                const LRU = require('lru-cache')
                this.renderer.spa.cache = new LRU({ max })
            }
        }

        // Patch already created renderer (first load)
        if (vueRenderer.renderer.spa) {
            const LRU = require('lru-cache')
            vueRenderer.renderer.spa.cache = new LRU({ max })
        }
    })
}