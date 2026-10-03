# Server, Client Build and Assets

How a Reldens project is laid out on disk, which copy of every file the server and the browser read, how the client is
built and how files reach the `dist` folder.

## Project Folders

All the paths are resolved by `ThemeManager.setupPaths()` (`lib/game/server/theme-manager.js:130-191`), the names come
from `GameConst.STRUCTURE` (`lib/game/constants.js:58-77`):

- `node_modules/reldens` - the Reldens package (`reldensModulePath`). Its `theme/default` folder is the default theme
  used as the copy source by the install and rebuild commands, never read at runtime.
- `theme/<project-theme>` - the project theme (`projectThemePath`), the theme name comes from the project `index.js`
  (`projectThemeName`). It holds `index.html`, `index.js`, `config.js`, `css/` and `assets/`.
- `theme/<project-theme>/assets` - the project assets (`projectAssetsPath`): `maps`, `custom/sprites`, `audio`, `html`,
  etc. This is the source copy of every asset.
- `theme/plugins` - the project server and client plugins (`projectPluginsPath`).
- `theme/admin` - the admin panel templates, CSS and JS (`projectAdminPath`).
- `dist` - the published folder (`distPath`), with `dist/assets` (`assetsDistPath`) and `dist/css` (`cssDistPath`).
  This is the only folder the browser reads.

## What the Server Reads

- Maps: `MapsLoader.reloadMaps(projectThemePath)` runs on every startup (`lib/game/server/manager.js:228`) and loads
  every JSON in `theme/<project-theme>/assets/maps` into the `server/maps` config (`lib/game/server/maps-loader.js:21-55`).
  The rooms, the physics world, the collisions, the change points and the respawn areas are built from this copy, so a
  map change reaches the server only after a restart.
- Server code: the project `index.js`, `theme/plugins` and `node_modules/reldens/lib`, loaded once by Node.

## What the Browser Reads

- Express serves `dist` as the static root when `RELDENS_EXPRESS_SERVE_STATICS=1` (`lib/game/server/manager.js:314-316`,
  `@reldens/server-utils` `AppServerFactory.serveStatics()`), and the homepage from `dist` when
  `RELDENS_EXPRESS_SERVE_HOME=1` (`lib/game/server/manager.js:309-313`).
- Every `/assets/...` URL is resolved inside `dist/assets`, never inside the theme folder:
  - map JSON: `/assets/maps/<map>.json` (`lib/game/client/scene-preloader.js:107`)
  - tileset images: `/assets/maps/<image>` (`lib/game/client/scene-preloader.js:175`)
  - object sprites: `/assets/custom/sprites/<file>` (`lib/game/client/scene-preloader.js:198`)
  - UI templates: `/assets/html/...` (`lib/game/client/scene-preloader.js:134-164`)
- The game client JS and CSS are the Parcel bundle written into `dist`.

## How the Client Is Built

- `ThemeManager.buildClient()` runs Parcel on every `.html` file in the project theme root (`theme-manager.js:455-479`).
  The output goes to `dist` with the Parcel cache disabled (`theme-manager.js:522-551`, config
  `lib/bundlers/drivers/parcel-config`).
- The entry `theme/<project-theme>/index.html` loads `./config.js`, `./index.js` and `./css/styles.scss`
  (`theme/default/index.html:29-31`). The theme `index.js` requires `reldens/client` (`theme/default/index.js:21`), so
  the bundle includes the client code of the installed `node_modules/reldens` package plus the theme client plugin.
- `ThemeManager.buildCss()` builds `css/styles.scss` into the theme `css` folder and copies `styles.css` into `dist/css`
  only when it does not exist yet (`theme-manager.js:395-415`).
- `config.js` is written into the project theme by `HomepageLoader.createConfigFile()` on startup
  (`lib/game/server/homepage-loader.js:51-62`, called from `manager.js:241-248`), it holds `window.reldensInitialConfig`
  and only reaches the browser through the bundle.
- Client code changes (`lib/*/client`, the theme `index.js` or `index.html`, the client plugin) only reach the browser
  after a new bundle.

## When the Bundle Runs

- On startup: `startGameServerInstance()` calls `ThemeManager.createClientBundle()` when `RELDENS_CREATE_CONFIG_FILE` is
  not `0` (`manager.js:241-250`). `createClientBundle()` does nothing unless `RELDENS_ALLOW_RUN_BUNDLER=1`; with
  `RELDENS_FORCE_RESET_DIST_ON_BUNDLE=1` it resets `dist` first and with `RELDENS_FORCE_COPY_ASSETS_ON_BUNDLE=1` it runs
  `copyAssetsToDist()` first, then it calls `buildClient()` (`theme-manager.js:682-696`).
- On demand, from the project root (the theme name argument selects the project theme):
  - `npm exec -- reldens buildClient <project-theme>` - client bundle only, copies no assets.
  - `npm exec -- reldens buildCss <project-theme>` - styles only.
  - `npm exec -- reldens buildSkeleton` - styles and client.
- The CLI commands run the `ThemeManager` method with the same name (`bin/commander.js:113-118`), `buildClient` skips
  only with `RELDENS_ALLOW_BUILD_CLIENT=0`.

## How Files Reach dist/assets

- `copyAssetsToDist` copies the whole project theme `assets` folder into `dist/assets`, overwriting files with the same
  name (`theme-manager.js:274-282`).
- On startup `validateOrCreateTheme()` copies the assets only when `dist` does not exist (`theme-manager.js:649-663`).
- Admin uploads: after an entity save, `@reldens/cms` calls `autoSyncDistCallback` for every upload property
  (`@reldens/cms/lib/admin-manager/router-contents.js:376-387`), wired to `AdminDistHelper.copyBucketFilesToDist`
  (`lib/admin/server/subscribers/create-admin-subscriber.js:58`), which copies the saved files from the property `bucket`
  into its `distFolder`. For rooms, `map_filename` and `scene_images` use the bucket
  `theme/<project-theme>/assets/maps` and the dist folder `dist/assets/maps`
  (`lib/rooms/server/entities/rooms-entity-override.js:27-46`, `bucketFullPath` is the project theme path,
  `lib/game/server/data-server-initializer.js:40`). Uploading a map through the rooms edit form updates both copies at
  once, no build or copy command is needed.
- Files edited by hand in the theme folder do not reach `dist` until `copyAssetsToDist` runs.

## Commands That Overwrite Project Files

- `installSkeleton` overwrites the project `index.js` (`copyIndex(true)`), deletes `dist` (`resetDist()`) and runs
  `fullRebuild` (`theme-manager.js:598-604`).
- `fullRebuild` runs `copyNew()` and then `buildSkeleton()` and `copyAdminFiles()` (`theme-manager.js:588-593`).
- `copyNew()` copies the package default theme over the project theme, the default assets into `dist/assets`, the
  default plugins over `theme/plugins` and the default admin over `theme/admin` (`theme-manager.js:577-583`). The copy
  overwrites every file with the same name and keeps the extra ones (`@reldens/server-utils` `FileHandler.copyFolderSync()`),
  so any project map, sprite or plugin that also exists in the default theme is replaced by the default version.

## What Each Change Needs

- Map or tileset image saved through the rooms admin form: restart the server (the browser already gets the new `dist`
  copy).
- Map or asset edited by hand in the theme folder: `copyAssetsToDist`, then restart the server.
- Server code, plugins or database rows read on startup: restart the server.
- Client code or theme `index.html` / `index.js`: `buildClient`, then reload the browser.
- Theme styles: `buildCss`, then reload the browser.
