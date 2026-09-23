/**
 *
 * Reldens - Security State
 *
 * Server side e2e endpoints and reset for the login security features. The endpoints lower the limits a spec needs to
 * reach quickly, ban accounts, deny addresses, list the stored address blocks, simulate the restart that restores them
 * and mark a reset password email as sent. The reset runs before every test with the players reset, so the lockouts,
 * joins, bans, denied addresses and stored blocks left by one spec never affect the next one.
 *
 */

const { Logger, sc } = require('@reldens/utils');
const { GameConst } = require('../../../lib/game/constants');
const { ServerManagersInitializer } = require('../../../lib/game/server/server-managers-initializer');

class SecurityState
{

    static defaultSettings = {};
    static bannedUsersStatus = {};
    static resetSentUsernames = [];
    static denyListTimer = null;

    static captureDefaults(serverManager)
    {
        let loginManager = serverManager.loginManager;
        SecurityState.defaultSettings = {
            maxAttempts: loginManager.loginAttempts.maxAttempts,
            registrationMaxPerIp: loginManager.registrationMaxPerIp,
            guestsMaxPerIp: loginManager.guestsMaxPerIp,
            gameLoginMaxJoins: loginManager.securityConfig.gameLogin.maxJoins,
            ipListsEnabled: serverManager.configManager.getWithoutLogs('server/security/ipLists/enabled', false)
        };
    }

    static applySettings(serverManager, settings)
    {
        let loginManager = serverManager.loginManager;
        loginManager.loginAttempts.maxAttempts = Number(settings.maxAttempts);
        loginManager.registrationMaxPerIp = Number(settings.registrationMaxPerIp);
        loginManager.guestsMaxPerIp = Number(settings.guestsMaxPerIp);
        loginManager.securityConfig.gameLogin.maxJoins = Number(settings.gameLoginMaxJoins);
        for(let instanceId of Object.keys(serverManager.roomsManager.createdInstances)){
            serverManager.roomsManager.createdInstances[instanceId].gameLoginMaxJoins = Number(settings.gameLoginMaxJoins);
        }
    }

    static async banUser(serverManager, username)
    {
        let usersRepository = serverManager.dataServer.getEntity('users');
        let user = await usersRepository.loadOneBy('username', username);
        if(!user){
            return false;
        }
        if(!sc.hasOwn(SecurityState.bannedUsersStatus, username)){
            SecurityState.bannedUsersStatus[username] = user.status;
        }
        await usersRepository.updateById(user.id, {status: GameConst.BANNED_USER_STATUS});
        return true;
    }

    static async restoreBannedUsers(serverManager)
    {
        let usersRepository = serverManager.dataServer.getEntity('users');
        for(let username of Object.keys(SecurityState.bannedUsersStatus)){
            let user = await usersRepository.loadOneBy('username', username);
            if(user){
                await usersRepository.updateById(user.id, {status: SecurityState.bannedUsersStatus[username]});
            }
            delete SecurityState.bannedUsersStatus[username];
        }
    }

    static async denyAddresses(serverManager, addresses, durationMs)
    {
        let ipListsRepository = serverManager.dataServer.getEntity('ipLists');
        for(let address of addresses){
            await ipListsRepository.create({address, list_type: 'deny', reason: 'e2e deny list test'});
        }
        SecurityState.setIpListsEnabled(serverManager, true);
        await ServerManagersInitializer.refreshIpLists(serverManager);
        SecurityState.denyListTimer = setTimeout(() => {
            SecurityState.liftDenyList(serverManager).catch((error) => {
                Logger.error('[security-state] Deny list could not be lifted: '+error.message);
            });
        }, durationMs);
    }

    static async liftDenyList(serverManager)
    {
        clearTimeout(SecurityState.denyListTimer);
        SecurityState.denyListTimer = null;
        SecurityState.setIpListsEnabled(serverManager, SecurityState.defaultSettings.ipListsEnabled);
        await SecurityState.deleteStoredAddresses(serverManager);
        await ServerManagersInitializer.refreshIpLists(serverManager);
    }

    static setIpListsEnabled(serverManager, enabled)
    {
        sc.deepMergeProperties(serverManager.configManager, {server: {security: {ipLists: {enabled}}}});
    }

    static async deleteStoredAddresses(serverManager)
    {
        let ipListsRepository = serverManager.dataServer.getEntity('ipLists');
        for(let storedAddress of await ipListsRepository.loadAll()){
            await ipListsRepository.deleteById(storedAddress.id);
        }
    }

    static async fetchStoredBlocks(serverManager)
    {
        let storedBlocks = [];
        for(let storedAddress of await serverManager.dataServer.getEntity('ipLists').loadBy('list_type', 'deny')){
            if(!storedAddress.expires_at){
                continue;
            }
            storedBlocks.push({address: storedAddress.address, expiresAt: new Date(storedAddress.expires_at).getTime()});
        }
        return storedBlocks;
    }

    static async markResetSent(serverManager, username)
    {
        await serverManager.dataServer.getEntity('users').updateBy(
            'username',
            username,
            {password_reset_sent_at: sc.formatDate(new Date())}
        );
        SecurityState.resetSentUsernames.push(username);
        return await SecurityState.fetchResetSentTime(serverManager, username);
    }

    static async fetchResetSentTime(serverManager, username)
    {
        let user = await serverManager.dataServer.getEntity('users').loadOneBy('username', username);
        if(!user){
            return 0;
        }
        return new Date(sc.get(user, 'password_reset_sent_at', 0)).getTime();
    }

    static async clearResetSentTimes(serverManager)
    {
        let usersRepository = serverManager.dataServer.getEntity('users');
        for(let username of SecurityState.resetSentUsernames){
            await usersRepository.updateBy('username', username, {password_reset_sent_at: null});
        }
        SecurityState.resetSentUsernames = [];
    }

    static async resetAll(serverManager)
    {
        SecurityState.applySettings(serverManager, SecurityState.defaultSettings);
        serverManager.loginManager.loginAttempts.reset();
        await SecurityState.restoreBannedUsers(serverManager);
        await SecurityState.liftDenyList(serverManager);
        await SecurityState.clearResetSentTimes(serverManager);
        Logger.info('[security-state] Login attempts, bans, address lists and reset emails cleared.');
    }

    static registerEndpoints(serverManager)
    {
        SecurityState.captureDefaults(serverManager);
        let app = serverManager.app;
        app.post('/api/e2e/security/settings', (request, response) => {
            SecurityState.applySettings(serverManager, {...SecurityState.defaultSettings, ...request.body});
            response.json({ok: true});
        });
        app.post('/api/e2e/security/ban-user', async (request, response) => {
            response.json({ok: await SecurityState.banUser(serverManager, sc.get(request.body, 'username', ''))});
        });
        app.post('/api/e2e/security/deny-addresses', async (request, response) => {
            await SecurityState.denyAddresses(
                serverManager,
                sc.get(request.body, 'addresses', []),
                Number(sc.get(request.body, 'durationMs', 3000))
            );
            response.json({ok: true});
        });
        app.get('/api/e2e/security/stored-blocks', async (request, response) => {
            response.json({blocks: await SecurityState.fetchStoredBlocks(serverManager)});
        });
        app.post('/api/e2e/security/restore-blocks', async (request, response) => {
            serverManager.loginManager.loginAttempts.reset();
            response.json({restored: await serverManager.loginManager.loginAttempts.restoreAddressBlocks(Date.now())});
        });
        app.post('/api/e2e/security/mark-reset-sent', async (request, response) => {
            let username = sc.get(request.body, 'username', '');
            response.json({sentTime: await SecurityState.markResetSent(serverManager, username)});
        });
        app.get('/api/e2e/security/reset-sent-time', async (request, response) => {
            let username = sc.get(request.query, 'username', '');
            response.json({sentTime: await SecurityState.fetchResetSentTime(serverManager, username)});
        });
        Logger.info('[security-state] Security endpoints registered.');
    }

}

module.exports.SecurityState = SecurityState;
