/**
 *
 * Reldens - ServerManagersInitializer
 *
 * Extracted manager initialization methods from ServerManager to keep that class within size limits.
 * All static methods receive the serverManager instance and operate on its properties.
 *
 */

const ReldensASCII = require('../reldens-ascii');
const PackageData = require('./../../../package.json');
const { FeaturesManager } = require('../../features/server/manager');
const { UsersManager } = require('../../users/server/manager');
const { LoginManager } = require('./login-manager');
const { RoomsManager } = require('../../rooms/server/manager');
const { Mailer } = require('./mailer');
const { ForgotPassword } = require('./forgot-password');
const { Encryptor } = require('@reldens/server-utils');
const { sc, Logger } = require('@reldens/utils');

class ServerManagersInitializer
{

    static buildBaseManagerConfig(serverManager)
    {
        return {
            events: serverManager.events,
            dataServer: serverManager.dataServer,
            config: serverManager.configManager
        };
    }

    static showInfoLogs(serverManager)
    {
        Logger.info('info', 'Server ready.'+ReldensASCII);
        Logger.info('Main packages:', [
            'parcel: '+PackageData.dependencies['@parcel/core'],
            'colyseus: '+PackageData.dependencies['@colyseus/core'],
            'phaser: '+PackageData.dependencies['phaser'],
            'firebase: '+PackageData.dependencies['firebase'],
            'reldens/utils: '+PackageData.dependencies['@reldens/utils'],
            'reldens/storage: '+PackageData.dependencies['@reldens/storage'],
            'reldens/modifiers: '+PackageData.dependencies['@reldens/modifiers'],
            'reldens/items-system: '+PackageData.dependencies['@reldens/items-system'],
            'reldens/skills: '+PackageData.dependencies['@reldens/skills'],
        ]);
        Logger.info('Server listening on '+serverManager.configManager.get('server/baseUrl'));
    }

    static async initializeManagers(serverManager)
    {
        let event = {serverManager, continueProcess: true};
        await serverManager.events.emit('reldens.beforeInitializeManagers', event);
        if(!event.continueProcess){
            return false;
        }
        Logger.info('Initialize Managers.');
        await ServerManagersInitializer.initializeMailer(serverManager);
        await ServerManagersInitializer.initializeFeaturesManager(serverManager);
        ServerManagersInitializer.initializeUsersManager(serverManager);
        await ServerManagersInitializer.initializeRoomsManager(serverManager);
        ServerManagersInitializer.initializeLoginManager(serverManager);
        await serverManager.loginManager.loginAttempts.restoreAddressBlocks(Date.now());
        await ServerManagersInitializer.checkInsecureDefaults(serverManager);
        await ServerManagersInitializer.defineServerRooms(serverManager);
        return true;
    }

    static async checkInsecureDefaults(serverManager)
    {
        let monitorConfig = serverManager.configManager.get('server/monitor');
        if(monitorConfig.enabled && !monitorConfig.auth){
            Logger.critical('The Colyseus monitor is enabled WITHOUT authentication at "/colyseus".');
        }
        let adminRoleId = serverManager.configManager.getWithoutLogs('server/admin/roleId', 0);
        if(!adminRoleId){
            return false;
        }
        let adminUsers = await serverManager.dataServer.getEntity('users').loadBy('role_id', adminRoleId);
        for(let adminUser of adminUsers){
            if(!Encryptor.validatePassword('root', adminUser.password)){
                continue;
            }
            Logger.critical(
                'The administrator user "'+adminUser.username+'" still has the sample password, change it with:'
                +' npm exec -- reldens resetPassword --user='+adminUser.username+' --pass=<new-password>'
            );
        }
        return true;
    }

    static async defineServerRooms(serverManager)
    {
        await serverManager.events.emit('reldens.serverBeforeDefineRooms', {serverManager});
        await serverManager.roomsManager.defineRoomsInGameServer(serverManager.gameServer, {
            loginManager: serverManager.loginManager,
            config: serverManager.configManager,
            dataServer: serverManager.dataServer,
            featuresManager: serverManager.featuresManager
        });
    }

    static initializeLoginManager(serverManager)
    {
        serverManager.loginManager = new LoginManager({
            config: serverManager.configManager,
            usersManager: serverManager.usersManager,
            roomsManager: serverManager.roomsManager,
            mailer: serverManager.mailer,
            themeManager: serverManager.themeManager,
            events: serverManager.events,
            appServer: serverManager.appServer,
            ipListsRepository: serverManager.dataServer.getEntity('ipLists')
        });
    }

    static async initializeRoomsManager(serverManager)
    {
        serverManager.roomsManager = new RoomsManager(
            ServerManagersInitializer.buildBaseManagerConfig(serverManager)
        );
        await serverManager.events.emit('reldens.serverBeforeLoginManager', {serverManager});
    }

    static initializeUsersManager(serverManager)
    {
        serverManager.usersManager = new UsersManager(
            ServerManagersInitializer.buildBaseManagerConfig(serverManager)
        );
    }

    static async initializeFeaturesManager(serverManager)
    {
        let baseConfig = ServerManagersInitializer.buildBaseManagerConfig(serverManager);
        serverManager.featuresManager = new FeaturesManager({...baseConfig, themeManager: serverManager.themeManager});
        serverManager.configManager.availableFeaturesList = await serverManager.featuresManager.loadFeatures();
        await serverManager.events.emit('reldens.serverConfigFeaturesReady', {
            serverManager,
            configProcessor: serverManager.configManager
        });
    }

    static async initializeMailer(serverManager, mailer)
    {
        serverManager.mailer = mailer || new Mailer();
        if(serverManager.mailer.readyForSetup){
            let result = await serverManager.mailer.setupTransporter();
            if(!result){
                Logger.error('Mailer setup failed.');
                return false;
            }
        }
        Logger.info('Mailer: '+(serverManager.mailer?.isEnabled() ? 'enabled' : 'disabled'));
        await ForgotPassword.defineRequestOnServerManagerApp(serverManager);
    }

    static createBeforeUpgradeHandler(serverManager)
    {
        return (upgradeRequest, authContext) => {
            if(serverManager.appServerFactory.ipListsConfigurer.isAllowed(authContext.ip)){
                return;
            }
            Logger.warning('Denied WebSocket upgrade for address: '+authContext.ip);
            return new Response(null, {status: 403});
        };
    }

    static async refreshIpLists(serverManager)
    {
        let configuredIpLists = serverManager.configManager.get('server/appServerConfig/ipLists');
        let storedEntries = await ServerManagersInitializer.loadStoredIpLists(serverManager);
        serverManager.appServerFactory.ipListsConfigurer.setLists({
            enabled: Boolean(serverManager.configManager.getWithoutLogs(
                'server/security/ipLists/enabled',
                configuredIpLists.enabled
            )),
            allow: configuredIpLists.allow
                .concat(serverManager.configManager.getWithoutLogs('server/security/ipLists/allow', []))
                .concat(storedEntries.allow),
            deny: configuredIpLists.deny
                .concat(serverManager.configManager.getWithoutLogs('server/security/ipLists/deny', []))
                .concat(storedEntries.deny)
        });
    }

    static async loadStoredIpLists(serverManager)
    {
        let storedEntries = {allow: [], deny: []};
        let ipListsRepository = serverManager.dataServer.getEntity('ipLists');
        if(!ipListsRepository){
            Logger.warning('The "ipLists" entity is missing, run the entities generation to persist the IP lists.');
            return storedEntries;
        }
        for(let storedEntry of await ipListsRepository.loadAll()){
            if(storedEntry.expires_at){
                continue;
            }
            if('allow' === storedEntry.list_type){
                storedEntries.allow.push(storedEntry.address);
                continue;
            }
            storedEntries.deny.push(storedEntry.address);
        }
        return storedEntries;
    }

    static configGuestEmailDomain(serverManager)
    {
        let customGuestEmailDomain = serverManager.configManager.getWithoutLogs(
            'server/players/guestsUser/emailDomain',
            ''
        );
        if('' === customGuestEmailDomain){
            sc.deepMergeProperties(
                serverManager.configManager,
                {server: {players: {guestsUser: {emailDomain: serverManager.guestsEmailDomain}}}}
            );
            return;
        }
        serverManager.guestsEmailDomain = customGuestEmailDomain;
    }

    static async configRoomsServerUrl(serverManager)
    {
        let roomsRepository = serverManager.dataServer.getEntity('rooms');
        let rooms = await roomsRepository.loadAll();
        if(!rooms || 0 === rooms.length){
            return;
        }
        let servers = {};
        // @hoff
        for(let room of rooms){
            servers[room.name] = room.server_url
                || serverManager.configManager.get('server/publicUrl')
                || serverManager.configManager.get('server/baseUrl');
        }
        sc.deepMergeProperties(serverManager.configManager, {client: {rooms: {servers}}});
    }

}

module.exports.ServerManagersInitializer = ServerManagersInitializer;
