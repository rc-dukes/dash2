# AGENTS.md

Dash: in-browser self-driving car simulator and lattice-based motion planner. Plain ES6 JavaScript running in Chrome (WebGL2), GPU-parallel path planning via WebGL shaders.

## Build / Test Commands
- Install deps: `npm install`
- Dev build (default): `npm run build` (webpack, mode=development)
- Production build: `npm run build -- --mode=production` (or `./run`)
- Watch mode: `npm run watch` (or `./run -w`)
- Lint: none configured.
- Tests: none. The `test` script is a placeholder; do NOT invent test/lint commands.

## Code Style
- ES6 modules: `import`/`export`, one `export default class` per file.
- Always include the `.js` extension in relative imports: `import Car from "../physics/Car.js"`.
- Use double quotes for strings/imports. 2-space indentation. Semicolons on statements (import lines sometimes omit them).
- `const` by default, `let` when reassigned; never `var` in app code.
- Naming: classes `PascalCase`; methods/vars `camelCase`; class constants `UPPER_SNAKE_CASE` (e.g. `Car.WHEEL_BASE`).
- Files: `PascalCase.js` for class modules, `camelCase.js` for non-class modules (e.g. gpgpu-programs).
- Three.js is a GLOBAL named `THREE` (do NOT `import` it): `new THREE.Vector2(...)`.
- `Math` is monkey-patched with helpers (`Math.wrapAngle`, `Math.clamp`) — see `js/Utils.js`/`Helpers.js`.
- Serialization pattern: implement `toJSON()` (abbreviated keys, `n.toFixed(5)`), static `fromJSON(json)`, and static `hydrate(obj)` using `Object.setPrototypeOf` to restore prototypes.
- Error handling is minimal: guard conditions plus `console.log` diagnostics. No try/catch framework.

## Structure
- `js/` app source (entry `js/Dash.js`): `autonomy/`, `physics/`, `simulator/`, `objects/`, `remote/`.
- `workers/` Web Worker source. `vendor/` third-party libs (not npm-managed). `dist/` build output (gitignored).
- `js/remote/` is the vert.x EventBus remote-control bridge (depends on an external `rc-dukes/dukes` backend); see `docs/remote-control.md`.
- Rebuild with `npm run build` after source changes.
