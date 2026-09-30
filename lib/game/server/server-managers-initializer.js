/**
 *
 * Reldens - ServerManagersInitializer
 *
 * Creates the server managers in their required order (Mailer, FeaturesManager, UsersManager, RoomsManager and
 * LoginManager), assigns them to the server manager and defines the rooms in the game server.
 *
 */

const { FeaturesManager } = require('../../features/server/manager');
const { UsersManager } = require('../../users/server/manager');
const { LoginManager } = require('./login-manager');
const { RoomsManager } = require('../../rooms/server/manager');
const { Mailer } = require('./mailer');
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
        await this.defineServerRooms();
        return true;
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
            featuresManager: this.serverManager.featuresManager
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
        this.serverManager.mailer = new Mailer();
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
