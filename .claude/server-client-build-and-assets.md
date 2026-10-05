# Server, Client Build and Assets

How a Reldens project is laid out on disk, which copy of every file the server and the browser read, how the client is
built and how files reach the `dist` folder.

## Project Folders

All the paths are resolved by `ThemeManager.setupPaths()` (`lib/game/server/theme-manager.js`), the names come from
`GameConst.STRUCTURE` (`lib/game/constants.js`):

- `node_modules/reldens` - the Reldens package (`reldensModulePath`). Its `theme/default` folder is the default theme
  used as the copy source by the install and rebuild commands, never read at runtime (on startup
  `ThemeManager.validateOrCreateTheme()` only copies it when the project theme folder is missing).
- `theme/<project-theme>` - the project theme (`projectThemePath`), the theme name comes from the project `index.js`
  (`projectThemeName`). It holds `index.html`, `index.js`, `config.js`, `css/` and `assets/`.
- `theme/<project-theme>/assets` - the project assets (`projectAssetsPath`): `maps`, `custom/sprites`, `audio`, `html`,
  etc. This is the source copy of every asset.
- `theme/plugins` - the project server and client plugins (`projectPluginsPath`).
- `theme/admin` - the admin panel templates, CSS and JS (`projectAdminPath`).
- `dist` - the published folder (`distPath`), with `dist/assets` (`assetsDistPath`) and `dist/css` (`cssDistPath`).
  This is the only folder the browser reads.

## What the Server Reads

- Maps: `MapsLoader.reloadMaps(projectThemePath, configManager)` runs on every startup, first line of
  `ServerManager.startGameServerInstance()` (`lib/game/server/manager.js`), and loads every JSON in
  `theme/<project-theme>/assets/maps` into the `server/maps` config (`MapsLoader.reloadMaps()` in
  `lib/game/server/maps-loader.js`). The rooms, the physics world, the collisions, the change points and the respawn
  areas are built from this copy, so a map change reaches the server only after a restart.

```js
MapsLoader.reloadMaps(this.themeManager.projectThemePath, this.configManager);
```

- Server code: the project `index.js`, `theme/plugins` and `node_modules/reldens/lib`, loaded once by Node.

## What the Browser Reads

- Express serves `dist` as the static root when `RELDENS_EXPRESS_SERVE_STATICS=1` (`@reldens/server-utils`
  `AppServerFactory.serveStatics()`), and the homepage from `dist` when `RELDENS_EXPRESS_SERVE_HOME=1`, both from
  `ServerManager.enableServeStaticsAndHomePage()` (`lib/game/server/manager.js`).
- Every `/assets/...` URL is resolved inside `dist/assets`, never inside the theme folder (`ScenePreloader` in
  `lib/game/client/scene-preloader.js`):
  - map JSON: `/assets/maps/<map>.json` (`preloadMapJson()`)
  - tileset images: `/assets/maps/<image>` (`preloadMapImages()`)
  - object sprites: `/assets/custom/sprites/<file>` (`preloadValidAssets()`)
  - UI templates: `/assets/html/...` (`preloadUiScene()`)

```js
this.load.tilemapTiledJSON(this.preloadMapKey, '/assets/maps/'+this.preloadMapKey+'.json');
```

- The game client JS and CSS are the Parcel bundle written into `dist`.

## How the Client Is Built

- `ThemeManager.buildClient()` runs Parcel on every `.html` file in the project theme root
  (`lib/game/server/theme-manager.js`). The output goes to `dist` with the Parcel cache disabled
  (`ThemeManager.generateDefaultBrowserBundleOptions()`, config `lib/bundlers/drivers/parcel-config`).
- The entry `theme/<project-theme>/index.html` loads `./config.js`, `./index.js` and `./css/styles.scss` (see
  `theme/default/index.html`). The theme `index.js` requires `reldens/client` (see `theme/default/index.js`), so the
  bundle includes the client code of the installed `node_modules/reldens` package plus the theme client plugin.

```html
<script type="text/javascript" id="reldens-initial-config" src="./config.js"></script>
<script type="module" src="./index.js"></script>
<link rel="stylesheet" type="text/css" href="./css/styles.scss"/>
```

- `ThemeManager.buildCss()` builds `css/styles.scss` into the theme `css` folder and copies `styles.css` into `dist/css`
  only when it does not exist yet (`FileHandler.copyFileSyncIfDoesNotExist()`).
- `config.js` is written into the project theme by `HomepageLoader.createConfigFile()` (`lib/game/server/homepage-loader.js`)
  on startup, called from `ServerManager.startGameServerInstance()` when `RELDENS_CREATE_CONFIG_FILE` is unset or `1`, it
  holds `window.reldensInitialConfig` and only reaches the browser through the bundle.
- Client code changes (`lib/*/client`, the theme `index.js` or `index.html`, the client plugin) only reach the browser
  after a new bundle.

## When the Bundle Runs

- On startup: `ServerManager.startGameServerInstance()` (`lib/game/server/manager.js`) writes `config.js` and calls
  `ThemeManager.createClientBundle()` only when `RELDENS_CREATE_CONFIG_FILE` is unset or `1`:

```js
if(1 === Number(process.env.RELDENS_CREATE_CONFIG_FILE || 1)){
    let populatedConfigFile = HomepageLoader.createConfigFile(
        this.themeManager.projectThemePath,
        Object.assign({}, this.configManager.gameEngine, {client: this.configManager.client})
    );
    if(!populatedConfigFile){
        Logger.error('Failed to create config file for homepage.');
    }
    await this.themeManager.createClientBundle();
}
```

- `ThemeManager.createClientBundle()` does nothing unless `RELDENS_ALLOW_RUN_BUNDLER=1`; with
  `RELDENS_FORCE_RESET_DIST_ON_BUNDLE=1` it resets `dist` first and with `RELDENS_FORCE_COPY_ASSETS_ON_BUNDLE=1` it runs
  `copyAssetsToDist()` first, then it calls `buildClient()`.
- On demand, from the project root (the theme name argument selects the project theme):
  - `npm exec -- reldens buildClient <project-theme>` - client bundle only, copies no assets.
  - `npm exec -- reldens buildCss <project-theme>` - styles only.
  - `npm exec -- reldens buildSkeleton` - styles and client.
- The CLI commands run the `ThemeManager` method with the same name (`Commander.execute()` in `bin/commander.js`),
  `buildClient` skips only with `RELDENS_ALLOW_BUILD_CLIENT=0`.

```js
async execute()
{
    await this.themeManager[this.command]();
    Logger.info('Command executed!');
    process.exit();
}
```

## How Files Reach dist/assets

- `ThemeManager.copyAssetsToDist()` copies the whole project theme `assets` folder into `dist/assets`, overwriting files
  with the same name.
- On startup `ThemeManager.validateOrCreateTheme()` copies the assets only when `dist` does not exist.
- Admin uploads: after an entity save, `@reldens/cms` calls `autoSyncDistCallback` for every upload property
  (`RouterContents.processSaveEntity()` in `node_modules/@reldens/cms/lib/admin-manager/router-contents.js`), wired to
  `AdminDistHelper.copyBucketFilesToDist` in `CreateAdminSubscriber.activateAdmin()`
  (`lib/admin/server/subscribers/create-admin-subscriber.js`), which copies the saved files from the property `bucket`
  into its `distFolder`. For rooms, `map_filename` and `scene_images` use the bucket
  `theme/<project-theme>/assets/maps` and the dist folder `dist/assets/maps`
  (`RoomsEntityOverride.propertiesConfig()` in `lib/rooms/server/entities/rooms-entity-override.js`, `bucketFullPath` is
  the project theme path set in `DataServerInitializer.initializeEntitiesAndDriver()`,
  `lib/game/server/data-server-initializer.js`). Uploading a map through the rooms edit form updates both copies at
  once, no build or copy command is needed.

```js
let bucket = FileHandler.joinPaths(projectConfig.bucketFullPath, 'assets', 'maps');
let bucketPath = RoomsConst.MAPS_BUCKET;
let distFolder = FileHandler.joinPaths(projectConfig.distPath, 'assets', 'maps');
```

- Files edited by hand in the theme folder do not reach `dist` until `copyAssetsToDist` runs.

## Commands That Overwrite Project Files

- `installSkeleton` overwrites the project `index.js` (`copyIndex(true)`), runs `copyServerFiles()` (the `.env`,
  `knexfile.js` and `.gitignore` samples are only copied when missing), deletes `dist` (`resetDist()`) and runs
  `fullRebuild` (`ThemeManager.installSkeleton()`).
- `createApp` overwrites the project `index.js` (`copyIndex(true)`), updates `package.json` (`updatePackageJson()`),
  runs `validateOrCreateTheme()`, deletes `dist` and runs `fullRebuild` (`ThemeManager.createApp()`).
- `fullRebuild` runs `copyNew()` and then `buildSkeleton()` and `copyAdminFiles()` (`ThemeManager.fullRebuild()`).
- `copyNew()` copies the package default theme over the project theme, the default assets into `dist/assets`, the
  default plugins over `theme/plugins` and the default admin over `theme/admin` (`ThemeManager.copyNew()`):

```js
copyNew()
{
    this.copyDefaultAssets();
    this.copyDefaultTheme();
    this.copyPackage();
    this.copyAdmin();
}
```

- The `copyNew()` copy overwrites every file with the same name and keeps the extra ones (`@reldens/server-utils`
  `FileHandler.copyFolderSync()`), so any project map, sprite or plugin that also exists in the default theme is replaced
  by the default version.

## What Each Change Needs

- Map or tileset image saved through the rooms admin form: restart the server (the browser already gets the new `dist`
  copy).
- Map or asset edited by hand in the theme folder: `copyAssetsToDist`, then restart the server.
- Server code, plugins or database rows read on startup: restart the server.
- Client code or theme `index.html` / `index.js`: `buildClient`, then reload the browser.
- Theme styles: `buildCss`, then reload the browser.
