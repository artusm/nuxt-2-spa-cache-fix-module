const LRU = require('lru-cache')
const nuxtSpaCacheFix = require('..')

// Mirrors real Nuxt 2 structure:
// nuxt.renderer (Server) → .renderer (VueRenderer) → .renderer { spa, ssr, modern }
function createMockNuxt() {
    const hooks = {}

    // VueRenderer mock
    const vueRenderer = {
        renderer: { spa: null },
        createRenderer() {
            // Simulates what Nuxt does — creates SPARenderer with unbounded cache
            this.renderer.spa = { cache: new LRU() }
        }
    }

    // Server mock (has .renderer pointing to VueRenderer)
    const server = {
        renderer: vueRenderer
    }

    return {
        hooks,
        server,
        vueRenderer,
        nuxt: {
            hook(name, fn) {
                hooks[name] = hooks[name] || []
                hooks[name].push(fn)
            },
            async callHook(name, ...args) {
                for (const fn of hooks[name] || []) {
                    await fn(...args)
                }
            },
            renderer: null // set to server before calling hook
        }
    }
}

describe('nuxt-spa-cache-fix', () => {
    test('wraps createRenderer and limits cache', async () => {
        const mock = createMockNuxt()

        nuxtSpaCacheFix.call({ nuxt: mock.nuxt }, {})

        mock.nuxt.renderer = mock.server
        await mock.nuxt.callHook('render:resourcesLoaded')
        mock.vueRenderer.createRenderer()

        expect(mock.vueRenderer.renderer.spa.cache.max).toBe(100)
    })

    test('respects custom max option', async () => {
        const mock = createMockNuxt()

        nuxtSpaCacheFix.call({ nuxt: mock.nuxt }, { max: 50 })

        mock.nuxt.renderer = mock.server
        await mock.nuxt.callHook('render:resourcesLoaded')
        mock.vueRenderer.createRenderer()

        expect(mock.vueRenderer.renderer.spa.cache.max).toBe(50)
    })

    test('patches already existing renderer', async () => {
        const mock = createMockNuxt()

        // SPA renderer already created before hook fires
        mock.vueRenderer.renderer.spa = { cache: new LRU() }

        nuxtSpaCacheFix.call({ nuxt: mock.nuxt }, {})

        mock.nuxt.renderer = mock.server
        await mock.nuxt.callHook('render:resourcesLoaded')

        expect(mock.vueRenderer.renderer.spa.cache.max).toBe(100)
    })

    test('handles missing renderer gracefully', async () => {
        const hooks = {}
        const mockNuxt = {
            hook(name, fn) { hooks[name] = [fn] },
            async callHook(name) {
                for (const fn of hooks[name] || []) await fn()
            },
            renderer: null
        }

        nuxtSpaCacheFix.call({ nuxt: mockNuxt }, {})

        // Should not throw
        await mockNuxt.callHook('render:resourcesLoaded')
    })

    test('logs warning when createRenderer patch fails', async () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation()
        const hooks = {}

        const vueRenderer = {
            renderer: { spa: null },
            createRenderer() {
                const spa = {}
                Object.defineProperty(spa, 'cache', {
                    set() { throw new Error('read-only cache') },
                    get() { return null }
                })
                this.renderer.spa = spa
            }
        }

        const mockNuxt = {
            hook(name, fn) { hooks[name] = (hooks[name] || []).concat(fn) },
            async callHook(name) {
                for (const fn of hooks[name] || []) await fn()
            },
            renderer: { renderer: vueRenderer }
        }

        nuxtSpaCacheFix.call({ nuxt: mockNuxt }, {})
        await mockNuxt.callHook('render:resourcesLoaded')
        vueRenderer.createRenderer()

        expect(warnSpy).toHaveBeenCalledWith(
            '[nuxt-2-spa-cache-fix-module] Failed to patch SPA cache:',
            expect.any(String)
        )
        warnSpy.mockRestore()
    })

    test('logs warning when hook initialization fails', async () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation()
        const hooks = {}

        const mockNuxt = {
            hook(name, fn) { hooks[name] = [fn] },
            async callHook(name) {
                for (const fn of hooks[name] || []) await fn()
            },
            renderer: { renderer: { createRenderer: null } }
        }

        nuxtSpaCacheFix.call({ nuxt: mockNuxt }, {})
        await mockNuxt.callHook('render:resourcesLoaded')

        expect(warnSpy).toHaveBeenCalledWith(
            '[nuxt-2-spa-cache-fix-module] Failed to initialize:',
            expect.any(String)
        )
        warnSpy.mockRestore()
    })

    test('works on subsequent createRenderer calls (hot reload)', async () => {
        const mock = createMockNuxt()

        nuxtSpaCacheFix.call({ nuxt: mock.nuxt }, {})

        mock.nuxt.renderer = mock.server
        await mock.nuxt.callHook('render:resourcesLoaded')

        mock.vueRenderer.createRenderer()
        expect(mock.vueRenderer.renderer.spa.cache.max).toBe(100)

        // Simulate hot reload
        mock.vueRenderer.createRenderer()
        expect(mock.vueRenderer.renderer.spa.cache.max).toBe(100)
    })
})
