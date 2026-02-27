const LRU = require('lru-cache')
const nuxtSpaCacheFix = require('..')

function createMockNuxt() {
    const hooks = {}

    return {
        hooks,
        renderer: {
            renderer: { spa: null },
            createRenderer() {
                // Simulates what Nuxt does — creates SPARenderer with unbounded cache
                this.renderer.spa = { cache: new LRU() }
            }
        },
        nuxt: {
            hook(name, fn) {
                hooks[name] = hooks[name] || []
                hooks[name].push(fn)
            },
            async callHook(name, ...args) {
                for (const fn of hooks[name] || []) {
                    await fn(...args)
                }
            }
        }
    }
}

describe('nuxt-spa-cache-fix', () => {
    test('wraps createRenderer and limits cache', async () => {
        const mock = createMockNuxt()

        // Register module (binds to mock context)
        nuxtSpaCacheFix.call({ nuxt: mock.nuxt }, {})

        // Simulate Nuxt lifecycle: resourcesLoaded → createRenderer
        mock.nuxt.renderer = mock.renderer
        await mock.nuxt.callHook('render:resourcesLoaded')
        mock.renderer.createRenderer()

        expect(mock.renderer.renderer.spa.cache.max).toBe(100)
    })

    test('respects custom max option', async () => {
        const mock = createMockNuxt()

        nuxtSpaCacheFix.call({ nuxt: mock.nuxt }, { max: 50 })

        mock.nuxt.renderer = mock.renderer
        await mock.nuxt.callHook('render:resourcesLoaded')
        mock.renderer.createRenderer()

        expect(mock.renderer.renderer.spa.cache.max).toBe(50)
    })

    test('patches already existing renderer', async () => {
        const mock = createMockNuxt()

        // Renderer already created before hook fires
        mock.renderer.renderer.spa = { cache: new LRU() }

        nuxtSpaCacheFix.call({ nuxt: mock.nuxt }, {})

        mock.nuxt.renderer = mock.renderer
        await mock.nuxt.callHook('render:resourcesLoaded')

        expect(mock.renderer.renderer.spa.cache.max).toBe(100)
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

    test('works on subsequent createRenderer calls (hot reload)', async () => {
        const mock = createMockNuxt()

        nuxtSpaCacheFix.call({ nuxt: mock.nuxt }, {})

        mock.nuxt.renderer = mock.renderer
        await mock.nuxt.callHook('render:resourcesLoaded')

        // First call
        mock.renderer.createRenderer()
        expect(mock.renderer.renderer.spa.cache.max).toBe(100)

        // Simulate hot reload — createRenderer called again
        mock.renderer.createRenderer()
        expect(mock.renderer.renderer.spa.cache.max).toBe(100)
    })
})