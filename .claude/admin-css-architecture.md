# Admin CSS Architecture - Elements / Components / Containers

## The 3-Tier Model

```
Elements   ->  admin-elements.css                     (global HTML element defaults)
Components ->  component-[name].css                   (reusable UI patterns)
Containers ->  container-[name].css                   (page sections / layouts)
```

Rules:
- Elements never reference other elements
- Components can override elements; never reference other components
- Containers can override components; never reference other containers
- Override cascade: `element default` -> `.component element` -> `.container .component element`
- The goal is to push styles as far UP the cascade as possible, eliminating redundant overrides at lower levels
- **Every container CSS file MUST have exactly ONE root selector** that wraps all child styles using nested `& .child` syntax

NOT elements (always part of a component or container):
`div`, `span`, `p`, `section`, `fieldset`, `ul`, `legend`, `img`

---

## Tier 1 - Elements (`admin-elements.css`)

Single global file. Not scoped under any class.

The goal is a strong enough baseline that most component and container files have NO element overrides — only layout and structural differences.

### Heading styles
- `h1` - white, `--font-size-2xl`, `margin-top: 0`
- `h2` - white, `--font-size-xl`, `margin-top: 0`
- `h3` - white, `--font-size-lg`, `margin-top: 0`
- `h4` - `--color-grey`, `--font-size-base` (labels/toggles, not page headings)

### Link styles
`color: var(--color-blue); text-decoration: none` / `:hover { color: var(--color-white) }`

### Input / textarea / select styles
`background-color: var(--color-grey-70)`, `color: var(--color-grey)`, `border: 1px solid var(--color-grey-40)`, `border-radius: var(--radius-sm)`, `padding: 0.5rem`.

Input types: `input[type="text"]`, `input[type="number"]`, `input[type="password"]`, `input[type="file"]`, `input[type="color"]`

### Label styles
`color: var(--color-grey); font-weight: 600; margin-bottom: 0.3rem`

---

## Tier 2 - Components

Each component file has ONE main class that wraps all child styles.

- `component-button.css` → `.button`
- `component-input-box.css` → `.input-box`
- `component-modal.css` → `.modal`
- `component-tooltip.css` → `.tooltip`
- `component-tooltip-click.css` → `.tooltip-click`
- `component-tooltip-inline.css` → `.tooltip-inline`
- `component-notification.css` → `.notification`
- `component-entries.css` → `.entity-view, .entity-edit`
- `component-canvas-panel.css` → `.canvas-panel`
- `component-config-item.css` → `.config-item`
- `component-image-viewer.css` → `.image-viewer`

### `component-modal.css` standard structure
- `.modal`, `.modal-backdrop`, `.modal-dialog`, `.modal-header`, `.modal-body`, `.modal-footer`
- `.modal-close-btn` (standardized name)
- `.modal-message` (generic message line)
- Width modifiers on `.modal-dialog`: `.modal-width-full`, `.modal-width-auto`

---

## Tier 3 - Containers

Each container file has ONE root selector. All children are nested inside it using `& .child`.

- `container-reldens-admin-panel.css` → `.reldens-admin-panel`
- `container-maps-wizard.css` → `.maps-wizard`
- `container-tileset-editor.css` → `.review-section`
- `container-tileset-legend-panel.css` → `.legend-panel`
- `container-tileset-tile-options.css` → `.tileset-analyzer`
- `container-theme-manager.css` → `.theme-manager`

### Container nesting rules
- Context overrides (e.g. "when `.tileset-tile-options` is inside `.global-tile-options`") are expressed as `& .global-tile-options .tileset-tile-options { }` — NOT using parent-context `&` at the end
- `min-width: 0` and `min-height: 0` are FORBIDDEN — they are a code smell; fix the layout instead

---

## Import Order (`reldens-admin-client.css`)

```css
@import './variables.css';
@import './admin-elements.css';
@import './component-button.css';
@import './component-modal.css';
@import './component-notification.css';
@import './component-input-box.css';
@import './component-config-item.css';
@import './component-tooltip.css';
@import './component-tooltip-click.css';
@import './component-tooltip-inline.css';
@import './component-entries.css';
@import './component-canvas-panel.css';
@import './component-image-viewer.css';
@import './container-reldens-admin-panel.css';
@import './container-forms.css';
@import './container-entity-list.css';
@import './container-maps-wizard.css';
@import './container-theme-manager.css';
@import './container-tileset-analyzer.css';
@import './container-tileset-uploader.css';
@import './container-tileset-editor.css';
@import './container-tileset-legend-panel.css';
@import './container-tileset-tile-options.css';
@import './container-generated-files.css';
@import './container-tileset-results.css';
```

---

## Key Rules Summary

1. **One root selector per file** — containers scope everything under a single class
2. **No `min-width: 0` / `min-height: 0`** — fix the flex layout properly instead
3. **No cross-tier references** — components don't reference other components; containers don't reference other containers
4. **Push styles up the cascade** — if a style applies everywhere, it belongs in elements or a component, not repeated in every container
5. **Parent-context selectors** (`some-parent &`) inside nested blocks should be rewritten as `& .some-parent .child` at the container root level for clarity
