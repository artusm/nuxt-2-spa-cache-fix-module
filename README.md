# nuxt-2-spa-cache-fix-module

[![CI](https://github.com/artusm/nuxt-2-spa-cache-fix-module/actions/workflows/ci.yml/badge.svg)](https://github.com/artusm/nuxt-2-spa-cache-fix-module/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/nuxt-2-spa-cache-fix-module.svg)](https://www.npmjs.com/package/nuxt-2-spa-cache-fix-module)
[![license](https://img.shields.io/npm/l/nuxt-2-spa-cache-fix-module.svg)](https://github.com/artusm/nuxt-2-spa-cache-fix-module/blob/main/LICENSE)

A Nuxt 2 module that fixes the unbounded LRU cache memory leak in `@nuxt/vue-renderer`'s `SPARenderer`. No file patching needed — works entirely via Nuxt's hook system.

## The Problem

In `@nuxt/vue-renderer` v2.17.3, the [`SPARenderer` constructor](https://github.com/nuxt/nuxt/blob/v2.17.3/packages/vue-renderer/src/renderers/spa.js#L14) creates an LRU cache with **no max limit**:

```js
// packages/vue-renderer/src/renderers/spa.js#L14
this.cache = new LRU() // no max — entries are cached forever
```

The cache key is built from the [full request URL](https://github.com/nuxt/nuxt/blob/v2.17.3/packages/vue-renderer/src/renderers/spa.js#L23-L24), including query parameters:

```js
// packages/vue-renderer/src/renderers/spa.js#L23-L24
const { url = '/' } = renderContext
const cacheKey = `${modern ? 'modern:' : 'legacy:'}${url}`
```

Every unique URL creates a new cache entry that is [never evicted](https://github.com/nuxt/nuxt/blob/v2.17.3/packages/vue-renderer/src/renderers/spa.js#L57):

```js
// packages/vue-renderer/src/renderers/spa.js#L57
this.cache.set(cacheKey, content) // stored forever, no max limit
```

In production, unique query strings (UTM tags, tracking params, cache busters, etc.) cause the cache to grow without bound, leading to **memory leaks** that eventually crash the Node.js process.

See: [nuxt/nuxt#32308](https://github.com/nuxt/nuxt/issues/32308) | [Full source: `spa.js`](https://github.com/nuxt/nuxt/blob/v2.17.3/packages/vue-renderer/src/renderers/spa.js)

## How It Works

The module hooks into Nuxt's `render:resourcesLoaded` event and wraps `VueRenderer.createRenderer()`. After each call (including hot reloads in dev), it replaces the unbounded cache with a bounded one.

```
Nuxt lifecycle:
  loadResources()
    → callHook('render:resourcesLoaded')   ← module hooks here
    → createRenderer()                      ← module wraps this
        → new SPARenderer()                 ← unbounded cache created
        → module replaces cache with bounded LRU({ max })
```

## Installation

```bash
# npm
npm install nuxt-2-spa-cache-fix-module

# yarn
yarn add nuxt-2-spa-cache-fix-module

# pnpm
pnpm add nuxt-2-spa-cache-fix-module

# bun
bun add nuxt-2-spa-cache-fix-module
```

> `lru-cache` v5 is already installed in every Nuxt 2 project as a transitive dependency of `@nuxt/vue-renderer`. No need to add it separately.

## Usage

### Module syntax (recommended)

```js
// nuxt.config.js
export default {
  modules: [
    ['nuxt-2-spa-cache-fix-module', { max: 100 }]
  ]
}
```

### With separate options

```js
// nuxt.config.js
export default {
  modules: [
    'nuxt-2-spa-cache-fix-module'
  ],
  'nuxt-2-spa-cache-fix-module': {
    max: 200
  }
}
```

### CommonJS (require)

```js
// nuxt.config.js
module.exports = {
  modules: [
    ['nuxt-2-spa-cache-fix-module', { max: 100 }]
  ]
}
```

### ES import

```js
// nuxt.config.js
import spaCacheFix from 'nuxt-2-spa-cache-fix-module'

export default {
  modules: [
    [spaCacheFix, { max: 100 }]
  ]
}
```

## Options

| Option | Type   | Default | Description                                          |
|--------|--------|---------|------------------------------------------------------|
| `max`  | Number | `100`   | Maximum number of entries in the SPA renderer cache. Once the limit is reached, the least recently used entry is evicted. |

### Choosing a `max` value

- **100** (default) — suitable for most sites with a limited number of routes
- **500–1000** — for sites with many unique pages (e-commerce catalogs, etc.)
- **50 or less** — for memory-constrained environments

The right value depends on your traffic patterns. Each cache entry holds the rendered SPA HTML shell, which is typically small (a few KB).

## Compatibility

- Nuxt 2.x (tested with 2.15–2.18)
- Node.js 14, 16, 18
- Works with both `mode: 'spa'` and `mode: 'universal'` (SPA fallback)

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test
```

## License

[MIT](LICENSE)
