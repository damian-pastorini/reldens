/**
 *
 * Reldens - Security Api
 *
 * HTTP client for the e2e security endpoints registered by SecurityState: lowered limits, bans, denied addresses,
 * stored address blocks, the simulated restart, the reset password sent time, the test mailer switch and the emails
 * recorded by the test mailer.
 *
 */

class SecurityApi
{

    static baseUrl(gameConfig)
    {
        let envPort = process.env.RELDENS_E2E_PORT || null;
        return envPort ? 'http://localhost:'+envPort : (gameConfig.baseUrl || 'http://localhost:8080');
    }

    static async request(gameConfig, method, path, body)
    {
        let options = {method, headers: {'Content-Type': 'application/json'}};
        if(body){
            options.body = JSON.stringify(body);
        }
        return await (await fetch(new URL(path, SecurityApi.baseUrl(gameConfig)).toString(), options)).json();
    }

    static async updateSettings(gameConfig, settings)
    {
        return await SecurityApi.request(gameConfig, 'POST', '/api/e2e/security/settings', settings);
    }

    static async banUser(gameConfig, username)
    {
        return await SecurityApi.request(gameConfig, 'POST', '/api/e2e/security/ban-user', {username});
    }

    static async denyAddresses(gameConfig, addresses, durationMs)
    {
        return await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/security/deny-addresses',
            {addresses, durationMs}
        );
    }

    static async fetchStoredBlocks(gameConfig)
    {
        return (await SecurityApi.request(gameConfig, 'GET', '/api/e2e/security/stored-blocks')).blocks;
    }

    static async restoreBlocks(gameConfig)
    {
        return (await SecurityApi.request(gameConfig, 'POST', '/api/e2e/security/restore-blocks', {})).restored;
    }

    static async markResetSent(gameConfig, username)
    {
        return (await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/security/mark-reset-sent',
            {username}
        )).sentTime;
    }

    static async fetchResetSentTime(gameConfig, username)
    {
        return (await SecurityApi.request(
            gameConfig,
            'GET',
            '/api/e2e/security/reset-sent-time?username='+encodeURIComponent(username)
        )).sentTime;
    }

    static async setMailerEnabled(gameConfig, enabled)
    {
        return await SecurityApi.request(gameConfig, 'POST', '/api/e2e/security/mailer', {enabled});
    }

    static async fetchSentEmails(gameConfig)
    {
        return (await SecurityApi.request(gameConfig, 'GET', '/api/e2e/security/sent-emails')).emails;
    }

}

module.exports.SecurityApi = SecurityApi;
