# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2025-02-27

### Fixed

- Preserve return value from original `createRenderer()` in the wrapper

## [1.1.0] - 2025-02-27

### Fixed

- Fix renderer access path — correctly traverse `nuxt.renderer.renderer` (Server → VueRenderer) instead of `nuxt.renderer` which pointed to the Server instance, not VueRenderer
- Tests now mirror the real Nuxt 2 internal structure (Server → VueRenderer → `{ spa, ssr, modern }`)

## [1.0.0] - 2025-02-27

### Added

- Nuxt 2 module that patches `SPARenderer`'s unbounded LRU cache with a configurable `max` limit
- Hooks into `render:resourcesLoaded` and wraps `createRenderer()` — no file patching needed
- Patches already-created renderers (edge case: `createRenderer` ran before hook)
- Handles hot reloads in dev (subsequent `createRenderer` calls)
- Try/catch error handling — module never crashes Nuxt, logs warnings on failure
- TypeScript type definitions
- Jest test suite (7 tests)
- CI/CD via GitHub Actions (test matrix on Node 16/18/20, publish to npm on tag)
- LICENSE, README with source code references to upstream Nuxt renderer

[1.1.1]: https://github.com/artusm/nuxt-2-spa-cache-fix-module/releases/tag/v1.1.1
[1.1.0]: https://github.com/artusm/nuxt-2-spa-cache-fix-module/releases/tag/v1.1.0
[1.0.0]: https://github.com/artusm/nuxt-2-spa-cache-fix-module/releases/tag/v1.0.1
