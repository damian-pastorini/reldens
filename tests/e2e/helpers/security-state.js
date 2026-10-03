/**
 *
 * Reldens - Security State
 *
 * Server side e2e endpoints and reset for the login security features. The endpoints lower the limits a spec needs to
 * reach quickly, ban accounts, deny addresses, list the stored address blocks, simulate the restart that restores them
 * mark a reset password email as sent and switch the mailer on or off with a test sender that only records the emails,
 * so no real email is ever sent and the app .env mailer settings never matter. The reset runs before every test with
 * the players reset, so the lockouts, joins, bans, denied addresses, stored blocks and mailer state left by one spec
 * never affect the next one.
 *
 */

const { Logger, sc } = require('@reldens/utils');
const { GameConst } = require('../../../lib/game/constants');

class SecurityState
{

    static defaultSettings = {};
    static bannedUsersStatus = {};
    static resetSentUsernames = [];
    static denyListTimer = null;
    static mailerDefaults = {};
    static sentEmails = [];

    static captureDefaults(serverManager)
    {
        let loginManager = serverManager.loginManager;
        SecurityState.defaultSettings = {
            maxAttempts: loginManager.loginAttempts.maxAttempts,
            registrationMaxPerIp: loginManager.userRegistration.registrationMaxPerIp,
            guestsMaxPerIp: loginManager.userRegistration.guestsMaxPerIp,
            gameLoginMaxJoins: serverManager.configManager.getWithoutLogs('server/security/gameLogin/maxJoins', 20),
            ipListsEnabled: serverManager.configManager.getWithoutLogs('server/security/ipLists/enabled', false)
        };
        let mailer = serverManager.mailer;
        SecurityState.mailerDefaults = {
            enabled: mailer.enabled,
            transporter: mailer.transporter,
            serviceInstance: mailer.serviceInstance
        };
    }

    static setMailerEnabled(serverManager, enabled)
    {
        let mailer = serverManager.mailer;
        if(!enabled){
            mailer.enabled = false;
            mailer.transporter = false;
            return;
        }
        mailer.enabled = true;
        mailer.transporter = {e2eTransporter: true};
        mailer.serviceInstance = {
            sendMail: async (sendProps) => {
                SecurityState.sentEmails.push({to: sendProps.mailOptions.to, subject: sendProps.mailOptions.subject});
                return true;
            }
        };
    }

    static restoreMailer(serverManager)
    {
        Object.assign(serverManager.mailer, SecurityState.mailerDefaults);
        SecurityState.sentEmails = [];
    }

    static applySettings(serverManager, settings)
    {
        let loginManager = serverManager.loginManager;
        let gameLoginMaxJoins = Number(settings.gameLoginMaxJoins);
        loginManager.loginAttempts.maxAttempts = Number(settings.maxAttempts);
        loginManager.userRegistration.registrationMaxPerIp = Number(settings.registrationMaxPerIp);
        loginManager.userRegistration.guestsMaxPerIp = Number(settings.guestsMaxPerIp);
        serverManager.configManager.server.security.gameLogin.maxJoins = gameLoginMaxJoins;
        for(let instanceId of Object.keys(serverManager.roomsManager.createdInstances)){
            serverManager.roomsManager.createdInstances[instanceId].gameLoginMaxJoins = gameLoginMaxJoins;
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
        await serverManager.ipListsUpgradeGuard.refresh();
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
        await serverManager.ipListsUpgradeGuard.refresh();
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
            storedBlocks.push({
                address: storedAddress.address,
                expiresAt: new Date(storedAddress.expires_at).getTime()
            });
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
        for(let sentEmail of SecurityState.sentEmails){
            await usersRepository.updateBy('email', sentEmail.to, {password_reset_sent_at: null});
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
        SecurityState.restoreMailer(serverManager);
        Logger.info('[security-state] Login attempts, bans, address lists, reset emails and mailer cleared.');
    }

    static registerEndpoints(serverManager, config)
    {
        SecurityState.captureDefaults(serverManager);
        SecurityState.resetSentUsernames = [
            sc.get(config, 'e2eUsername', 'root'),
            sc.get(config, 'e2eUsername2', 'root2'),
            sc.get(config, 'e2eUsername3', 'root3')
        ];
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
        app.post('/api/e2e/security/mailer', (request, response) => {
            SecurityState.setMailerEnabled(serverManager, true === sc.get(request.body, 'enabled', false));
            response.json({ok: true});
        });
        app.get('/api/e2e/security/sent-emails', (request, response) => {
            response.json({emails: SecurityState.sentEmails});
        });
        Logger.info('[security-state] Security endpoints registered.');
    }

}

module.exports.SecurityState = SecurityState;
