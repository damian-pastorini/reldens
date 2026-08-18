# Admin Templates Architecture - Registry / Loader / Renderer

## The 5-Tier Model

```
1. Registry        ->  TemplatesList                   (lib/admin/server/templates-list.js)
2. Paths           ->  ThemeManager.adminTemplates     (lib/game/server/theme-manager.js)
3. Mapper          ->  TemplatesToPathMapper.map       (lib/game/server/templates-to-path-mapper.js)
4. Loader          ->  AdminTemplatesLoader            (@reldens/cms/lib/admin-templates-loader.js)
5. Renderer        ->  TemplateEngine                  (lib/game/server/template-engine.js)
```

Orchestration:

```
Setup     ->  CreateAdminSubscriber  ->  AdminManager  ->  ContentsBuilder
PerReq    ->  Router                 ->  RouterContents ->  ContentsBuilder.render
```

The tree shape is identical at every layer: `TemplatesList` == `adminTemplates` == `adminFilesContents`. Each layer transforms the LEAVES (filename -> absolute path -> file content) while preserving the keys and structure.

---

## Layer 1 - TemplatesList Registry

Single file at `lib/admin/server/templates-list.js` exporting a nested object that maps camelCase keys to HTML filenames:

```js
module.exports.TemplatesList = {
    login: 'login.html',
    dashboard: 'dashboard.html',
    layout: 'layout.html',
    sideBar: 'sidebar.html',
    sideBarHeader: 'sidebar-header.html',
    sideBarItem: 'sidebar-item.html',
    mapsWizard: 'maps-wizard.html',
    mapsWizardMapsSelection: 'maps-wizard-maps-selection.html',
    mapsElementsEditorScripts: 'maps-elements-editor-scripts.html',
    roomsActivePlayers: 'rooms-active-players.html',
    fields: {
        view: { text: 'text.html', boolean: 'boolean.html' },
        edit: { text: 'text.html', select: 'select.html' }
    },
    sections: {
        view: { rooms: 'rooms.html' },
        editForm: { objects: 'objects.html' }
    }
};
```

Three kinds of leaves:

- **Top-level page/fragment keys** (`login`, `dashboard`, `mapsWizardMapsSelection`, `mapsElementsEditorScripts`, `roomsActivePlayers`): standalone HTML files. `roomsActivePlayers` is rendered per request by `RoomsActivePlayersWarning` (`lib/admin/server/rooms-active-players-warning.js`) and assigned to `renderedViewProperties.extraContentForViewTop` on `reldens.adminViewPropertiesPopulation`, which is how a fragment gets live data into a page whose entity templates were precompiled at startup. A fragment whose content is reused inside another template (for example `mapsElementsEditorScripts`) is passed into that template as a Mustache variable - the loaded content string is handed to the consumer render as `{{&key}}` (see "Shared fragment variables" below). No Mustache `{{> }}` partials are used anywhere in the admin.
- **`fields.{view|edit}.{type}`**: per-property-type cell templates that `RouterContents` (`@reldens/cms`) selects when rendering list / view / edit field cells based on each property's resolved type.
- **`sections.{view|editForm|viewForm|list|edit}.{entityPath}`**: per-entity extension content. `ContentsBuilder.buildEntitiesContents` looks these up by `driverResource.entityPath` (e.g. `rooms`) and injects the rendered fragment into the generic view/list/edit templates via `{{&extraContentForViewBottom}}`-style placeholders.

Plugins may extend the list either by exporting their own TemplatesList and merging into the project one, or by mutating `themeManager.adminTemplatesList` at startup time via an event subscriber (see "Plugin Pages" below).

---

## Layer 2 - ThemeManager Paths

`ThemeManager.constructor` (`lib/game/server/theme-manager.js`) aliases the registry onto the instance:

```js
this.adminTemplatesList = TemplatesList;
```

`ThemeManager.setupPaths` derives the project's admin templates folder, then resolves the path tree:

```js
this.projectAdminTemplatesPath = FileHandler.joinPaths(this.projectAdminPath, structure.TEMPLATES);
this.adminTemplates = TemplatesToPathMapper.map(this.adminTemplatesList, this.projectAdminTemplatesPath);
```

After this, `themeManager.adminTemplates` is the same tree shape as `TemplatesList` but every leaf is an absolute file path under `theme/admin/templates/`.

---

## Layer 3 - TemplatesToPathMapper

Recursive name-to-path resolver at `lib/game/server/templates-to-path-mapper.js`:

```js
map(templateList, path)
{
    let result = {};
    for(let templateName of Object.keys(templateList)){
        if(sc.isObject(templateList[templateName])){
            result[templateName] = this.map(templateList[templateName], FileHandler.joinPaths(path, templateName));
            continue;
        }
        result[templateName] = FileHandler.joinPaths(path, templateList[templateName]);
    }
    return result;
}
```

Rule: object value -> recurse with the KEY appended to the path (so `fields.edit.text` -> `theme/admin/templates/fields/edit/text.html`). String value -> join the filename onto the current path. The subfolder names mirror the registry keys.

---

## Layer 4 - AdminTemplatesLoader

Lives in `@reldens/cms/lib/admin-templates-loader.js`. Exposes a singleton with one method:

```js
await AdminTemplatesLoader.fetchAdminFilesContents(adminTemplates)
```

It walks the path tree (same recursive shape as the mapper); for each leaf it calls `FileHandler.fetchFileContents` and writes the resulting string back under the same key. The output, `adminFilesContents`, has identical shape to `adminTemplates` but with file CONTENTS as leaves.

`CreateAdminSubscriber.activateAdmin` (`lib/admin/server/subscribers/create-admin-subscriber.js`) calls this exactly once at admin activation:

```js
let adminFilesContents = await AdminTemplatesLoader.fetchAdminFilesContents(themeManager.adminTemplates);
```

The content tree is handed to the `AdminManager` constructor, so it lives on `adminManager.adminFilesContents` and is reachable from every subscriber as `event.adminManager.adminFilesContents`.

---

## Layer 5 - TemplateEngine

`lib/game/server/template-engine.js` is a thin async wrapper around Mustache:

```js
class TemplateEngine
{
    static async render(content, params)
    {
        return await TemplateEngineRender.render(content, params);
    }

    static async renderFile(filePath, params)
    {
        let fileContent = FileHandler.fetchFileContents(filePath);
        if(!fileContent){
            Logger.error('File to be rendered not found.', {filePath});
            return '';
        }
        return await this.render(fileContent, params);
    }
}
```

`render(content, params)` is a plain Mustache pass-through: `params` supplies the values for the `{{&key}}` variables in `content`. Reused fragment content (such as the editor scripts) is just another entry in `params` - see "Shared fragment variables".

`ThemeManager.constructor` also aliases the class onto the instance for callers that prefer the instance-style access:

```js
this.templateEngine = TemplateEngine;
```

So `themeManager.templateEngine.render(content, params)` and `TemplateEngine.render(content, params)` are interchangeable.

---

## Layer 6 - AdminManager and ContentsBuilder

`CreateAdminSubscriber.activateAdmin` wires the admin pipeline:

```js
let adminFilesContents = await AdminTemplatesLoader.fetchAdminFilesContents(themeManager.adminTemplates);
let adminConfig = {
    ...,
    renderCallback: (content, params) => themeManager.templateEngine.render(content, params),
    adminFilesContents,
    ...
};
serverManager.serverAdmin = new AdminManager(adminConfig);
```

`AdminManager` constructs `ContentsBuilder` (`@reldens/cms/lib/admin-manager/contents-builder.js`) and forwards both fields. `ContentsBuilder.render(content, params)` is a single line: `return this.renderCallback(content, params)`. Every other render in the admin tree ultimately routes through that one method.

`AdminManager.setupAdmin` runs `ContentsBuilder.buildAdminContents()` once during startup, which:

- `buildLayout()` renders `adminFilesContents.layout` with placeholder slots (`{{&sideBar}}`, `{{&pageContent}}`) and caches it on `this.adminContents.layout`.
- `buildSideBar()` iterates `resources()` (entity definitions), renders one `adminFilesContents.sideBarItem` per entry, optionally wraps groups in `adminFilesContents.sideBarHeader`, then renders the whole nav into `adminFilesContents.sideBar`. The result is cached on `this.adminContents.sideBar`.
- `buildEntitiesContents()` walks the resources again; per entity it renders `adminFilesContents.list`, `adminFilesContents.view`, `adminFilesContents.edit` with placeholder slots for per-request data, and concatenates the matching `adminFilesContents.sections.{view|editForm|viewForm|list|edit}.{entityPath}` content into the appropriate extra-content slot. Cached on `this.adminContents.entities[entityName]`.

Per-request rendering happens in `Router` (`@reldens/cms/lib/admin-manager/router.js`) which dispatches to `RouterContents` (`@reldens/cms/lib/admin-manager/router-contents.js`). RouterContents calls `adminContentsRender(content, params)` (alias for `ContentsBuilder.render`) for the page body, then `adminContentsRenderRoute(pageContent, sideBar)` to wrap the body in the cached layout. The final HTML reaches Express via `res.send(...)`.

---

## adminContents vs adminFilesContents

Easy to confuse - they live on different objects and serve different roles:

- `adminFilesContents`
  - Owner: `AdminManager` (also reachable in subscribers as `event.adminManager.adminFilesContents`).
  - Shape: same as the TemplatesList tree.
  - Contents: RAW file content strings (pre-render).
  - Lifecycle: built once by `AdminTemplatesLoader.fetchAdminFilesContents` at activation.
- `adminContents`
  - Owner: `ContentsBuilder` (reachable as `adminManager.contentsBuilder.adminContents`).
  - Shape: flat object keyed by page / entity name.
  - Contents: RENDERED page strings (post-render, often with `{{&...}}` placeholders still inside for per-request data).
  - Lifecycle: built by `buildAdminContents()` during `AdminManager.setupAdmin`.

Subscribers that introduce new pages store rendered output on `adminManager.contentsBuilder.adminContents.{key}` and reference raw template content via `adminManager.adminFilesContents.{key}`.

---

## Plugin Pages

The established pattern for adding a new admin page (examples: `MapsWizardSubscriber`, `TilesetAnalyzerSubscriber`, `ThemeManagerSubscriber`, `ObjectsImporterSubscriber`, `SkillsImporterSubscriber`, `ShutdownSubscriber`):

1. Add a key to `TemplatesList` for the page template (and any per-page partials).
2. In the subscriber constructor, bind the render helpers:
   ```js
   this.render = adminManager.contentsBuilder.render.bind(adminManager.contentsBuilder);
   this.renderRoute = adminManager.contentsBuilder.renderRoute.bind(adminManager.contentsBuilder);
   ```
3. Hook `reldens.eventBuildSideBarBefore` to inject the navigation entry:
   ```js
   event.navigationContents['Wizards'][label] = await this.render(
       event.adminManager.adminFilesContents.sideBarItem,
       {name: label, path: this.rootPath + this.somePath}
   );
   ```
4. Hook `reldens.buildAdminContentsAfter` (fires after `buildAdminContents` finishes) to render the page body and cache it on `adminContents`:
   ```js
   let pageContent = await this.render(
       event.adminManager.adminFilesContents.tilesetAnalyzer,
       { rootPath: this.rootPath }
   );
   event.adminManager.contentsBuilder.adminContents.tilesetAnalyzer = await this.renderRoute(
       pageContent,
       event.adminManager.contentsBuilder.adminContents.sideBar
   );
   ```
5. Register an Express route that returns the cached page:
   ```js
   return res.send(await this.render(adminManager.contentsBuilder.adminContents.tilesetAnalyzer));
   ```

### Late-bound template extension

If a plugin needs to add a template entry AFTER `ThemeManager.setupPaths` has already run (so `adminTemplates` is already resolved), it must update BOTH the registry AND the paths tree. Example from `lib/admin/server/plugin.js`:

```js
extendAdminTemplates(event)
{
    let themeManager = event.serverManager.themeManager;
    themeManager.adminTemplatesList.fields.edit['tileset-file-item'] = 'tileset-file-item.html';
    let templatesPath = FileHandler.joinPaths(themeManager.projectAdminTemplatesPath, 'fields', 'edit');
    themeManager.adminTemplates.fields.edit['tileset-file-item'] = FileHandler.joinPaths(
        templatesPath,
        'tileset-file-item.html'
    );
}
```

This runs before `CreateAdminSubscriber.activateAdmin`, so when `AdminTemplatesLoader.fetchAdminFilesContents` walks `themeManager.adminTemplates`, the new leaf is present and gets loaded.

---

## Shared fragment variables

The admin uses no Mustache `{{> }}` partials. A fragment that is reused across templates is loaded into `adminFilesContents` like any other template and then passed as a normal Mustache variable (`{{&key}}`) into each consumer template's render. The consumer template declares the `{{&key}}` slot; whoever renders that template supplies the loaded fragment string in the render params.

### Example - the maps elements editor scripts

`theme/admin/templates/maps-elements-editor-scripts.html` contains the static `<script src=...>` tags needed by the maps elements editor. The registry entry is:

```js
mapsElementsEditorScripts: 'maps-elements-editor-scripts.html'
```

`AdminTemplatesLoader` loads it into `adminFilesContents.mapsElementsEditorScripts`. Its two consumer templates declare the variable slot at the end of their markup:

```html
{{&mapsElementsEditorScripts}}
```

Because the two consumers are rendered through different paths, the variable is supplied at two different points (both reldens-owned, no `@reldens/cms` edit required):

- `theme/admin/templates/maps-wizard-maps-selection.html` is rendered per request by `MapsWizardSubscriber.mapsWizardMapsSelection`, which controls the render `data`. It sets `data.mapsElementsEditorScripts = sc.get(adminManager.adminFilesContents, 'mapsElementsEditorScripts', '')` before calling `render`, so the variable resolves at render time.
- `theme/admin/templates/sections/view/rooms.html` is the entity view section, pre-rendered once at setup by `ContentsBuilder.buildEntitiesContents` with only `{id, entitySerializedData}` kept literal (every other variable not in that list is emptied during that render). To survive that, `MapsElementsEditorSubscriber.injectScriptsVariableIntoRoomsSection` fills the slot in `adminManager.adminFilesContents.sections.view.rooms` before the section is rendered. The subscriber is constructed inside `reldens.beforeSetupAdminManager` (see `lib/admin/server/plugin.js`), which runs before `AdminManager.setupAdmin` calls `buildEntitiesContents`, and the fill is synchronous so it always completes first.

### Adding another shared fragment variable

1. Create the fragment at `theme/admin/templates/{slug}.html` and register it as `slugKey: '{slug}.html'` in `TemplatesList`.
2. Add `{{&slugKey}}` to each consumer template.
3. In whatever code renders each consumer, put the loaded content into the render params under `slugKey` (for a CMS-rendered entity section, fill the slot on `adminFilesContents.sections...` before setup, as the editor subscriber does for rooms).

---

## Entity Section Templates

`sections.{view|editForm|viewForm|list|edit}.{entityPath}` is the convention for per-entity extra content injected into the generic templates. `ContentsBuilder.buildEntitiesContents` looks up the entity's section by its `entityPath` (the table name with underscores converted to dashes):

```js
let sectionsContents = this.adminFilesContents?.sections;
let extraContentForView = await this.render(
    sc.get(sectionsContents?.view, driverResource.entityPath, ''),
    { id: '{{&id}}', entitySerializedData: '{{&entitySerializedData}}' }
);
```

If a key matches, the section is pre-rendered and concatenated into the page's extra-content slot (`{{&extraContentForViewBottom}}` etc.). If no key matches, the slot stays empty and the page renders without the extension.

### Adding a per-entity view extension

1. Create `theme/admin/templates/sections/view/{entityPath}.html`.
2. Add to TemplatesList: `sections: { view: { [entityPath]: '{entityPath}.html' } }`.
3. The contents builder picks it up automatically; no further wiring.

---

## Render Lifecycle

```
ServerStart
  -> ThemeManager.constructor
        this.adminTemplatesList = TemplatesList                       (registry alias)
  -> ThemeManager.setupPaths
        this.projectAdminTemplatesPath = {root}/theme/admin/templates
        this.adminTemplates = TemplatesToPathMapper.map(adminTemplatesList, projectAdminTemplatesPath)

  -> reldens.beforeCreateAdminManager event                           (plugins may extend the list here)

  -> CreateAdminSubscriber.activateAdmin
        adminFilesContents = AdminTemplatesLoader.fetchAdminFilesContents(themeManager.adminTemplates)
        renderCallback = (content, params) => templateEngine.render(content, params)
        new AdminManager({ adminFilesContents, renderCallback, ... })

  -> AdminManager.setupAdmin
        ContentsBuilder.buildAdminContents()
            buildLayout()      -> adminContents.layout
            buildSideBar()     -> adminContents.sideBar
            buildEntitiesContents() -> adminContents.entities[name].{list, view, edit}
        Router.setupAdminRoutes
        Router.setupEntitiesRoutes
        events: reldens.setupAdminRouter, reldens.setupAdminRoutes, reldens.setupAdminManagers

PerRequest (entity list / view / edit)
  -> Express -> Router handler
        RouterContents.generate{List|View|Edit}RouteContent
            ContentsBuilder.render(content, params)
                renderCallback(content, params)
                    TemplateEngine.render(content, params)
                        mustache.render(content, params)
        ContentsBuilder.renderRoute(pageContent, sideBar)
            wraps the body in the cached layout
  -> res.send(html)

PerRequest (subscriber-owned page)
  -> Express route handler
        res.send(await this.render(adminManager.contentsBuilder.adminContents.{pageKey}))
```

---

## Key Rules

1. **One source of truth** - every admin HTML file is registered in `TemplatesList`. Callers never read templates ad-hoc.
2. **Tree shape preserved** - `TemplatesList` shape == `adminTemplates` shape == `adminFilesContents` shape. Each layer transforms only the leaves.
3. **camelCase keys, kebab-case filenames** - `mapsElementsEditorScripts: 'maps-elements-editor-scripts.html'`. Render params and section keys reference templates by the camelCase key.
4. **No Mustache partials** - the admin uses no `{{> }}` partials. A reused fragment is loaded into `adminFilesContents` and passed to its consumer as a `{{&key}}` variable in that render's params (see "Shared fragment variables").
5. **renderCallback is the choke point** - every admin render funnels through the same `(content, params)` Mustache pass-through. No subscriber renders templates outside that callback.
6. **Plugins extend at the right phase** - `reldens.beforeCreateAdminManager` fires before the loader; later extensions must touch BOTH `adminTemplatesList` AND `adminTemplates` to remain visible to the loader.
7. **`adminContents` (rendered cache) is NOT `adminFilesContents` (raw file contents)** - know which one you need before reaching for it.

---

## File Reference

Project files:

- `lib/admin/server/templates-list.js` - the registry; maps camelCase keys to filenames.
- `lib/game/server/theme-manager.js` - owns `adminTemplatesList` and `adminTemplates`; resolves the base templates folder.
- `lib/game/server/templates-to-path-mapper.js` - recursive name-to-path conversion (singleton).
- `lib/game/server/template-engine.js` - `(content, params)` pass-through to `mustache.render`.
- `lib/admin/server/subscribers/create-admin-subscriber.js` - loads `adminFilesContents`, wires `renderCallback`, hands both to `AdminManager`.
- `theme/admin/templates/**/*.html` - the actual template files; subfolder layout mirrors the TemplatesList tree.

`@reldens/cms` package files (consumed, not edited from this repo):

- `lib/admin-templates-loader.js` - walks the path tree, reads files into `adminFilesContents`.
- `lib/admin-manager.js` - owns `adminFilesContents` and `renderCallback`; instantiates `ContentsBuilder`, `Router`, `RouterContents`.
- `lib/admin-manager/contents-builder.js` - builds layout, sideBar, and entities content into `adminContents`; exposes `render` (the renderCallback alias) and `renderRoute`.
- `lib/admin-manager/router-contents.js` - selects per-property-type templates from `adminFilesContents.fields.{view|edit}` for field cells.
