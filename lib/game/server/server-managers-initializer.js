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
const { EnvVar } = require('@reldens/utils');
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
        Logger.info('Server listening on '+serverManager.configServer.host+':'+serverManager.configServer.port);
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
        await ServerManagersInitializer.checkInsecureDefaults(serverManager);
        await ServerManagersInitializer.defineServerRooms(serverManager);
        return true;
    }

    static async checkInsecureDefaults(serverManager)
    {
        if('' === String(process.env.RELDENS_ADMIN_SECRET || '')){
            Logger.critical('The RELDENS_ADMIN_SECRET is empty, the administration panel session can not be signed.');
        }
        if(serverManager.configServer.monitor.enabled && !serverManager.configServer.monitor.auth){
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
            configServer: serverManager.configServer,
            appServer: serverManager.appServer,
            ipListsRepository: serverManager.dataServer.getEntity('ipLists'),
            mailerForgotPasswordLimit: EnvVar.number(process.env, 'RELDENS_MAILER_FORGOT_PASSWORD_LIMIT', 4)
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
        serverManager.featuresManager = new FeaturesManager({
            ...baseConfig,
            themeManager: serverManager.themeManager
        });
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

    static fetchMonitorFromEnvironmentVariables()
    {
        return {
            enabled: EnvVar.boolean(process.env, 'RELDENS_MONITOR', false),
            auth: EnvVar.boolean(process.env, 'RELDENS_MONITOR_AUTH', false),
            user: EnvVar.nonEmptyString(process.env, 'RELDENS_MONITOR_USER', ''),
            pass: EnvVar.nonEmptyString(process.env, 'RELDENS_MONITOR_PASS', '')
        };
    }

    static fetchSecurityFromEnvironmentVariables()
    {
        return {
            loginAttemptsEnabled: EnvVar.boolean(process.env, 'RELDENS_LOGIN_ATTEMPTS_ENABLED', true),
            loginAttemptsMax: EnvVar.number(process.env, 'RELDENS_LOGIN_ATTEMPTS_MAX', 10),
            loginAttemptsBlockTimeMs: EnvVar.number(process.env, 'RELDENS_LOGIN_ATTEMPTS_BLOCK_MS', 900000),
            passwordMinimumLength: EnvVar.number(process.env, 'RELDENS_PASSWORD_MINIMUM_LENGTH', 3),
            registrationMaxPerIp: EnvVar.number(process.env, 'RELDENS_REGISTRATION_MAX_PER_IP', 10),
            guestsMaxPerIp: EnvVar.number(process.env, 'RELDENS_GUESTS_MAX_PER_IP', 20),
            gameLoginWindowMs: EnvVar.number(process.env, 'RELDENS_GAME_LOGIN_WINDOW_MS', 60000),
            gameLoginMaxJoins: EnvVar.number(process.env, 'RELDENS_GAME_LOGIN_MAX_JOINS', 20),
            validateRoomsOrigin: EnvVar.boolean(process.env, 'RELDENS_VALIDATE_ROOMS_ORIGIN', false),
            allowRequestsWithoutOrigin: EnvVar.boolean(process.env, 'RELDENS_ALLOW_REQUESTS_WITHOUT_ORIGIN', true),
            signedTokensSecret: EnvVar.nonEmptyString(
                process.env,
                'RELDENS_SIGNED_TOKENS_SECRET',
                EnvVar.nonEmptyString(process.env, 'RELDENS_ADMIN_SECRET', '')
            ),
            guestsCleanupEnabled: EnvVar.boolean(process.env, 'RELDENS_GUESTS_CLEANUP_ENABLED', false),
            guestsCleanupAfterMs: EnvVar.number(process.env, 'RELDENS_GUESTS_CLEANUP_AFTER_MS', 604800000),
            guestsCleanupIntervalMs: EnvVar.number(process.env, 'RELDENS_GUESTS_CLEANUP_INTERVAL_MS', 3600000)
        };
    }

    static fetchIpListsFromEnvironmentVariables()
    {
        return {
            enabled: 1 === Number(process.env.RELDENS_IP_LISTS_ENABLED || 0),
            allow: String(process.env.RELDENS_IP_ALLOW_LIST || '').split(',').filter((entry) => '' !== entry),
            deny: String(process.env.RELDENS_IP_DENY_LIST || '').split(',').filter((entry) => '' !== entry)
        };
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
        let configuredIpLists = serverManager.configServer.appServerConfig.ipLists;
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
        let currentDate = sc.getCurrentDate();
        for(let storedEntry of await ipListsRepository.loadAll()){
            if(storedEntry.expires_at && String(storedEntry.expires_at) < currentDate){
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
                || serverManager.configServer.publicUrl
                || serverManager.configServer.host+':'+serverManager.configServer.port;
        }
        sc.deepMergeProperties(serverManager.configManager, {client: {rooms: {servers}}});
    }

}

module.exports.ServerManagersInitializer = ServerManagersInitializer;
