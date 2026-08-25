import { ReldensEventsManager } from './events';

/** Any class Reldens will instantiate for you. */
export type CustomClassConstructor = new (...args: unknown[]) => unknown;

/**
 * The server half of the customClasses tree, as Reldens reads it at runtime.
 * Lookup sites verified in lib source (v4.0.0-beta.39.9):
 *   objects                lib/objects/server/manager.js, keyed by objects.object_class_key
 *   roomsClass             lib/rooms/server/manager.js,  keyed by rooms.roomClassPath
 *   sceneDataProcessor     lib/rooms/server/scene-data-filter.js, a single class
 *   inventory.items/groups lib/inventory/server/subscribers/server-subscriber.js
 *   skills.skillsList/classPath  lib/actions/server/data-loader.js
 * A missing objects key falls back to the built-in type; a room whose
 * roomClassPath names an unregistered class is SKIPPED with an error.
 */
export interface ServerCustomClasses {
    objects?: Record<string, CustomClassConstructor>;
    roomsClass?: Record<string, CustomClassConstructor>;
    sceneDataProcessor?: CustomClassConstructor;
    inventory?: {
        items?: Record<string, CustomClassConstructor>;
        groups?: Record<string, CustomClassConstructor>;
    };
    skills?: {
        skillsList?: Record<string, CustomClassConstructor>;
        classPath?: Record<string, CustomClassConstructor>;
    };
    [bucket: string]: object | undefined;
}

/**
 * lib/config/server/manager.js. `configList.server.customClasses` is seeded from
 * the ServerManager config's `customClasses` and is the object plugins mutate on
 * reldens.beforeInitializeManagers.
 */
export interface ServerConfigManager {
    configList: {
        server: {customClasses: ServerCustomClasses} & Record<string, unknown>;
        client: Record<string, unknown>;
    };
    get(path: string, defaultValue?: unknown): unknown;
    getWithoutLogs(path: string, defaultValue?: unknown): unknown;
    [key: string]: unknown;
}

/** Config object handed to `new ServerManager(config)`. */
export interface ServerManagerConfig {
    /** Absolute path to the project root. Reldens writes .env, dist/, theme/ and install.lock relative to it. */
    projectRoot: string;
    /** Folder name under `theme/`. Defaults to 'default'. */
    projectThemeName?: string;
    /**
     * Where the reldens package itself lives. Defaults to `<projectRoot>/node_modules/reldens`,
     * which is wrong under npm workspaces hoisting - pass it explicitly.
     */
    reldensModulePath?: string;
    jsSourceMaps?: boolean;
    cssSourceMaps?: boolean;
    /** A class (not an instance). Reldens does `new customPlugin()` then calls `setup({events})`. */
    customPlugin?: new () => { setup(props: { events: ReldensEventsManager }): void };
    /** Runtime class overrides merged into `server/customClasses/*` config. */
    customClasses?: Record<string, unknown>;
    [key: string]: unknown;
}

/**
 * Reldens - ServerManager (generated from lib source at v4.0.0-beta.39.9).
 * Own members are typed from the source; values the source does not model are
 * `unknown`, never `any`.
 */
export declare class ServerManager {
    constructor(config: ServerManagerConfig, eventsManager?: ReldensEventsManager, dataServerDriver?: unknown);
    app: unknown;
    appServer: unknown;
    appServerFactory: unknown;
    autoGenerateEntities: boolean;
    configManager: ServerConfigManager;
    configServer: object;
    customPlugin: unknown;
    dataServer: unknown;
    dataServerConfig: object;
    dataServerDriver: unknown;
    events: ReldensEventsManager;
    featuresManager: unknown;
    gameServer: unknown;
    guestsEmailDomain: string;
    installationType: string;
    installer: unknown;
    installerDataServer: unknown;
    isHotPlugEnabled: boolean;
    loginManager: unknown;
    mailer: unknown;
    projectRoot: string;
    rawConfig: object;
    roomsManager: unknown;
    themeManager: unknown;
    translations: object;
    usersManager: unknown;
    createAppServer(): Promise<unknown>;
    createGameServer(): Promise<unknown>;
    createServers(): Promise<unknown>;
    enableServeStaticsAndHomePage(): Promise<unknown>;
    fetchConfigServerFromEnvironmentVariables(): unknown;
    initializeConfigManager(): Promise<unknown>;
    initializeConfiguration(config: unknown): unknown;
    initializeStorage(config: unknown, dataServerDriver: unknown): Promise<unknown>;
    serverBroadcast(props: unknown): Promise<unknown>;
    setupCustomServerPlugin(config: unknown): unknown;
    start(): Promise<unknown>;
    startGameServerInstance(): Promise<unknown>;
    validateServer(): unknown;
    [key: string]: unknown;
}
