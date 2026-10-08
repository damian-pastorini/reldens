/**
 *
 * Reldens - ServerManagersInitializer
 *
 * Creates the server managers in their required order (Mailer, FeaturesManager, UsersManager, RoomsManager and
 * LoginManager), assigns them to the server manager, starts the server health (ServerHealthMonitor, RoomsAvailability
 * and the server status route) and defines the rooms in the game server.
 *
 */

const { FeaturesManager } = require('../../features/server/manager');
const { UsersManager } = require('../../users/server/manager');
const { LoginManager } = require('./login-manager');
const { RoomsManager } = require('../../rooms/server/manager');
const { Mailer } = require('./mailer');
const { ServerHealthMonitor } = require('./health/server-health-monitor');
const { RemoteServersStatus } = require('./health/remote-servers-status');
const { RoomsAvailability } = require('./health/rooms-availability');
const { ServerStatusRoute } = require('./health/server-status-route');
const { GameConst } = require('../constants');
const { Logger } = require('@reldens/utils');

class ServerManagersInitializer
{

    /**
     * @param {ServerManager} serverManager
     */
    constructor(serverManager)
    {
        /** @type {ServerManager} */
        this.serverManager = serverManager;
    }

    /**
     * @returns {{events: EventsManager, dataServer: BaseDataServer, config: ConfigManager}}
     */
    buildBaseManagerConfig()
    {
        return {
            events: this.serverManager.events,
            dataServer: this.serverManager.dataServer,
            config: this.serverManager.configManager
        };
    }

    /**
     * @returns {Promise<boolean>}
     */
    async initializeManagers()
    {
        let event = {serverManager: this.serverManager, continueProcess: true};
        await this.serverManager.events.emit('reldens.beforeInitializeManagers', event);
        if(!event.continueProcess){
            return false;
        }
        Logger.info('Initialize Managers.');
        await this.initializeMailer();
        await this.initializeFeaturesManager();
        this.serverManager.usersManager = new UsersManager(this.buildBaseManagerConfig());
        await this.initializeRoomsManager();
        await this.initializeLoginManager();
        this.initializeServerHealth();
        await this.defineServerRooms();
        return true;
    }

    initializeServerHealth()
    {
        if(this.serverManager.serverHealthMonitor){
            this.serverManager.serverHealthMonitor.stop();
        }
        let configManager = this.serverManager.configManager;
        let healthConfig = configManager.getWithoutLogs('server/health', {});
        let serverHealthMonitor = new ServerHealthMonitor(healthConfig);
        serverHealthMonitor.start();
        this.serverManager.gameServer.shutdownCallbacks.push(() => serverHealthMonitor.stop());
        let expiringHmacToken = this.serverManager.loginManager.expiringHmacToken;
        let roomsManager = this.serverManager.roomsManager;
        this.serverManager.serverHealthMonitor = serverHealthMonitor;
        this.serverManager.roomsAvailability = new RoomsAvailability({
            serverHealthMonitor,
            remoteServersStatus: new RemoteServersStatus({
                expiringHmacToken,
                timeoutMs: healthConfig.remoteStatusTimeoutMs,
                cacheMs: healthConfig.checkIntervalMs
            }),
            isRoomCreated: roomsManager.isRoomCreated.bind(roomsManager),
            roomsServers: configManager.getWithoutLogs('client/rooms/servers', {}),
            serverSelfUrls: [
                configManager.getWithoutLogs('server/publicUrl', ''),
                configManager.getWithoutLogs('server/baseUrl', '')
            ]
        });
        let serverStatusRoute = new ServerStatusRoute({serverHealthMonitor, expiringHmacToken});
        this.serverManager.app.get(
            GameConst.ROUTE_PATHS.SERVER_STATUS,
            (req, res) => serverStatusRoute.handle(req, res)
        );
    }

    /**
     * @returns {Promise<void>}
     */
    async defineServerRooms()
    {
        await this.serverManager.events.emit('reldens.serverBeforeDefineRooms', {serverManager: this.serverManager});
        await this.serverManager.roomsManager.defineRoomsInGameServer(this.serverManager.gameServer, {
            loginManager: this.serverManager.loginManager,
            config: this.serverManager.configManager,
            dataServer: this.serverManager.dataServer,
            featuresManager: this.serverManager.featuresManager,
            serverHealthMonitor: this.serverManager.serverHealthMonitor,
            roomsAvailability: this.serverManager.roomsAvailability
        });
    }

    /**
     * @returns {Promise<void>}
     */
    async initializeLoginManager()
    {
        this.serverManager.loginManager = new LoginManager({
            config: this.serverManager.configManager,
            usersManager: this.serverManager.usersManager,
            roomsManager: this.serverManager.roomsManager,
            mailer: this.serverManager.mailer,
            themeManager: this.serverManager.themeManager,
            events: this.serverManager.events,
            appServer: this.serverManager.appServer,
            ipListsRepository: this.serverManager.dataServer.getEntity('ipLists')
        });
        await this.serverManager.loginManager.loginAttempts.restoreAddressBlocks(Date.now());
    }

    /**
     * @returns {Promise<void>}
     */
    async initializeRoomsManager()
    {
        this.serverManager.roomsManager = new RoomsManager(this.buildBaseManagerConfig());
        await this.serverManager.events.emit('reldens.serverBeforeLoginManager', {serverManager: this.serverManager});
    }

    /**
     * @returns {Promise<void>}
     */
    async initializeFeaturesManager()
    {
        let featuresManager = new FeaturesManager({
            ...this.buildBaseManagerConfig(),
            themeManager: this.serverManager.themeManager
        });
        this.serverManager.featuresManager = featuresManager;
        this.serverManager.configManager.availableFeaturesList = await featuresManager.loadFeatures();
        await this.serverManager.events.emit('reldens.serverConfigFeaturesReady', {
            serverManager: this.serverManager,
            configProcessor: this.serverManager.configManager
        });
    }

    /**
     * @returns {Promise<boolean|void>}
     */
    async initializeMailer()
    {
        this.serverManager.mailer = new Mailer({
            ...this.serverManager.configManager.getWithoutLogs('server/mailer', {}),
            projectRoot: this.serverManager.projectRoot,
            reldensModulePath: this.serverManager.themeManager.reldensModulePath
        });
        if(this.serverManager.mailer.readyForSetup){
            let result = await this.serverManager.mailer.setupTransporter();
            if(!result){
                Logger.error('Mailer setup failed.');
                return false;
            }
        }
        Logger.info('Mailer: '+(this.serverManager.mailer?.isEnabled() ? 'enabled' : 'disabled'));
    }

}

module.exports.ServerManagersInitializer = ServerManagersInitializer;
