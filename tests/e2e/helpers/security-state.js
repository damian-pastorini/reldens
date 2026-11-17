/**
 *
 * Reldens - Security State
 *
 * Server side e2e endpoints and reset for the login security features. The endpoints lower the limits a spec needs to
 * reach quickly, ban accounts, list the stored address blocks, simulate the restart that restores them, register the
 * address lists endpoints (IpListsState), mark a reset password email as sent and switch the mailer on or off with a test sender that only records the emails,
 * so no real email is ever sent and the app .env mailer settings never matter. The reset runs before every test with
 * the players reset, so the lockouts, joins, bans, denied addresses, stored blocks and mailer state left by one spec
 * never affect the next one.
 *
 */

const { Logger, sc } = require('@reldens/utils');
const { GameConst } = require('../../../lib/game/constants');
const { ParallelSpecGroups } = require('./parallel-spec-groups');
const { LoginServerState } = require('./login-server-state');
const { IpListsState } = require('./ip-lists-state');
const { PasswordResetState } = require('./password-reset-state');

class SecurityState
{

    static defaultSettings = {};
    static bannedUsersStatus = {};
    static resetSentUsernames = [];
    static mailerDefaults = {};
    static sentEmails = [];

    static captureDefaults(serverManager)
    {
        let loginManager = serverManager.loginManager;
        let configManager = serverManager.configManager;
        SecurityState.defaultSettings = {
            loginAttemptsEnabled: loginManager.loginAttempts.enabled,
            maxAttempts: loginManager.loginAttempts.maxAttempts,
            blockTimeMs: loginManager.loginAttempts.blockTimeMs,
            windowMs: loginManager.loginAttempts.windowMs,
            maxPendingValidations: loginManager.passwordValidationGuard.maxPendingValidations,
            gameLoginWindowMs: configManager.getWithoutLogs('server/security/gameLogin/windowMs', 60000),
            roomsLoginMaxJoins: configManager.getWithoutLogs('server/security/roomsLogin/maxJoins', 60),
            roomsLoginWindowMs: configManager.getWithoutLogs('server/security/roomsLogin/windowMs', 60000),
            registrationMaxPerIp: loginManager.userRegistration.registrationMaxPerIp,
            guestsMaxPerIp: loginManager.userRegistration.guestsMaxPerIp,
            allowRegistration: loginManager.userRegistration.allowRegistration,
            allowGuest: loginManager.userRegistration.allowGuest,
            allowGuestUserName: loginManager.userRegistration.allowGuestUserName,
            guestEmailDomain: loginManager.userRegistration.guestEmailDomain,
            gameLoginMaxJoins: configManager.getWithoutLogs('server/security/gameLogin/maxJoins', 20)
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
                if(PasswordResetState.consumeFailingSend()){
                    return false;
                }
                SecurityState.sentEmails.push({
                    to: sendProps.mailOptions.to,
                    subject: sendProps.mailOptions.subject,
                    html: sendProps.mailOptions.html
                });
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
        loginManager.loginAttempts.enabled = Boolean(settings.loginAttemptsEnabled);
        loginManager.loginAttempts.maxAttempts = Number(settings.maxAttempts);
        loginManager.loginAttempts.blockTimeMs = Number(settings.blockTimeMs);
        loginManager.loginAttempts.windowMs = Number(settings.windowMs);
        loginManager.passwordValidationGuard.maxPendingValidations = Number(settings.maxPendingValidations);
        loginManager.userRegistration.registrationMaxPerIp = Number(settings.registrationMaxPerIp);
        loginManager.userRegistration.guestsMaxPerIp = Number(settings.guestsMaxPerIp);
        loginManager.userRegistration.allowRegistration = settings.allowRegistration;
        loginManager.userRegistration.allowGuest = settings.allowGuest;
        loginManager.userRegistration.allowGuestUserName = settings.allowGuestUserName;
        loginManager.userRegistration.guestEmailDomain = settings.guestEmailDomain;
        SecurityState.applyJoinsSettings(serverManager, {
            gameLoginMaxJoins: Number(settings.gameLoginMaxJoins),
            gameLoginWindowMs: Number(settings.gameLoginWindowMs),
            roomsLoginMaxJoins: Number(settings.roomsLoginMaxJoins),
            roomsLoginWindowMs: Number(settings.roomsLoginWindowMs)
        });
    }

    static applyJoinsSettings(serverManager, joinsSettings)
    {
        sc.deepMergeProperties(serverManager.configManager, {server: {security: {
            gameLogin: {maxJoins: joinsSettings.gameLoginMaxJoins, windowMs: joinsSettings.gameLoginWindowMs},
            roomsLogin: {maxJoins: joinsSettings.roomsLoginMaxJoins, windowMs: joinsSettings.roomsLoginWindowMs}
        }}});
        for(let instanceId of Object.keys(serverManager.roomsManager.createdInstances)){
            Object.assign(serverManager.roomsManager.createdInstances[instanceId], joinsSettings);
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
        if(serverManager.serverAdmin?.router){
            serverManager.serverAdmin.router.blackList = {};
        }
        await SecurityState.restoreBannedUsers(serverManager);
        await IpListsState.liftLists(serverManager);
        await SecurityState.clearResetSentTimes(serverManager);
        SecurityState.restoreMailer(serverManager);
        PasswordResetState.resetAll(serverManager);
        LoginServerState.resetAll(serverManager);
        Logger.info('[security-state] Login attempts, bans, address lists, reset emails and mailer cleared.');
    }

    static registerEndpoints(serverManager, config)
    {
        SecurityState.captureDefaults(serverManager);
        LoginServerState.registerEndpoints(serverManager);
        IpListsState.registerEndpoints(serverManager);
        PasswordResetState.registerEndpoints(serverManager);
        SecurityState.resetSentUsernames = ParallelSpecGroups.fetchAllUsers(config).map(user => user.username);
        let app = serverManager.app;
        app.post('/api/e2e/security/settings', (request, response) => {
            SecurityState.applySettings(serverManager, {...SecurityState.defaultSettings, ...request.body});
            response.json({ok: true});
        });
        app.post('/api/e2e/security/ban-user', async (request, response) => {
            response.json({ok: await SecurityState.banUser(serverManager, sc.get(request.body, 'username', ''))});
        });
        app.get('/api/e2e/security/stored-blocks', async (request, response) => {
            response.json({blocks: await SecurityState.fetchStoredBlocks(serverManager)});
        });
        app.post('/api/e2e/security/restore-blocks', async (request, response) => {
            serverManager.loginManager.loginAttempts.reset();
            response.json({restored: await serverManager.loginManager.loginAttempts.restoreAddressBlocks(Date.now())});
        });
        app.post('/api/e2e/security/admin-black-list', (request, response) => {
            serverManager.serverAdmin.router.blackList = sc.get(request.body, 'blackList', {});
            response.json({ok: true});
        });
        app.get('/api/e2e/security/identity-hits', (request, response) => {
            let loginAttempts = serverManager.loginManager.loginAttempts;
            let identityKey = loginAttempts.identityKey(sc.get(request.query, 'identity', ''));
            response.json({
                hits: loginAttempts.countHits(identityKey, Date.now()),
                blocked: loginAttempts.isBlocked(identityKey, Date.now())
            });
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
