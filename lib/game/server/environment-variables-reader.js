/**
 *
 * Reldens - EnvironmentVariablesReader
 *
 * Reads the environment variables once at the ServerManager level and returns them grouped by feature, so every
 * class below receives its settings through the constructor arguments instead of reading the environment.
 *
 */

const { EnvVar, Logger, sc } = require('@reldens/utils');

class EnvironmentVariablesReader
{

    /**
     * @returns {Object}
     */
    static fetchConfigServerFromEnvironmentVariables()
    {
        let host = String(process.env.RELDENS_APP_HOST || 'http://localhost');
        let port = Number(process.env.PORT || 0);
        if(0 === port){
            port = Number(process.env.RELDENS_APP_PORT || 0);
            if(0 === port){
                port = 8080;
            }
        }
        let publicUrl = String(process.env.RELDENS_PUBLIC_URL || host+':'+port);
        let environmentConfig = {
            appServerConfig: {
                encoding: String(process.env.RELDENS_DEFAULT_ENCODING || 'utf-8'),
                useHttps: 1 === Number(process.env.RELDENS_EXPRESS_USE_HTTPS || 0),
                passphrase: String(process.env.RELDENS_EXPRESS_HTTPS_PASSPHRASE || ''),
                httpsChain: String(process.env.RELDENS_EXPRESS_HTTPS_CHAIN || ''),
                keyPath: String(process.env.RELDENS_EXPRESS_HTTPS_PRIVATE_KEY || ''),
                certPath: String(process.env.RELDENS_EXPRESS_HTTPS_CERT || ''),
                trustedProxy: String(process.env.RELDENS_EXPRESS_TRUSTED_PROXY || ''),
                globalRateLimit: 1 === Number(process.env.RELDENS_GLOBAL_RATE_LIMIT || 0),
                ipLists: this.fetchIpListsFromEnvironmentVariables(),
                windowMs: Number(process.env.RELDENS_EXPRESS_RATE_LIMIT_MS || 60000),
                maxRequests: Number(process.env.RELDENS_EXPRESS_RATE_LIMIT_MAX_REQUESTS || 30),
                applyKeyGenerator: 1 === Number(process.env.RELDENS_EXPRESS_RATE_LIMIT_APPLY_KEY_GENERATOR || 0),
                useHelmet: 1 === Number(process.env.RELDENS_USE_HELMET || 0),
                corsOrigin: String(process.env.RELDENS_CORS_ORIGIN || publicUrl)
            },
            host,
            port,
            publicUrl,
            security: this.fetchSecurityFromEnvironmentVariables(),
            firebase: this.fetchFirebaseFromEnvironmentVariables(),
            monitor: this.fetchMonitorFromEnvironmentVariables()
        };
        Logger.info('Server environment configuration:', {
            ...environmentConfig,
            appServerConfig: sc.omitProps(environmentConfig.appServerConfig, ['passphrase']),
            security: sc.omitProps(environmentConfig.security, ['signedTokensSecret']),
            monitor: sc.omitProps(environmentConfig.monitor, ['pass'])
        });
        return environmentConfig;
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

    static fetchFirebaseFromEnvironmentVariables()
    {
        return {
            enabled: EnvVar.boolean(process.env, 'RELDENS_FIREBASE_ENABLE', false),
            apiKey: EnvVar.nonEmptyString(process.env, 'RELDENS_FIREBASE_API_KEY', ''),
            authDomain: EnvVar.nonEmptyString(process.env, 'RELDENS_FIREBASE_AUTH_DOMAIN', ''),
            databaseURL: EnvVar.nonEmptyString(process.env, 'RELDENS_FIREBASE_DATABASE_URL', ''),
            projectId: EnvVar.nonEmptyString(process.env, 'RELDENS_FIREBASE_PROJECT_ID', ''),
            storageBucket: EnvVar.nonEmptyString(process.env, 'RELDENS_FIREBASE_STORAGE_BUCKET', ''),
            messagingSenderId: EnvVar.nonEmptyString(process.env, 'RELDENS_FIREBASE_MESSAGING_SENDER_ID', ''),
            appId: EnvVar.nonEmptyString(process.env, 'RELDENS_FIREBASE_APP_ID', ''),
            measurementId: EnvVar.nonEmptyString(process.env, 'RELDENS_FIREBASE_MEASUREMENTID', '')
        };
    }

    static fetchThemeFromEnvironmentVariables()
    {
        return {
            encoding: EnvVar.nonEmptyString(process.env, 'RELDENS_DEFAULT_ENCODING', 'utf8'),
            allowBuildCss: EnvVar.boolean(process.env, 'RELDENS_ALLOW_BUILD_CSS', true),
            allowBuildClient: EnvVar.boolean(process.env, 'RELDENS_ALLOW_BUILD_CLIENT', true),
            allowRunBundler: EnvVar.boolean(process.env, 'RELDENS_ALLOW_RUN_BUNDLER', false),
            forceResetDistOnBundle: EnvVar.boolean(process.env, 'RELDENS_FORCE_RESET_DIST_ON_BUNDLE', false),
            forceCopyAssetsOnBundle: EnvVar.boolean(process.env, 'RELDENS_FORCE_COPY_ASSETS_ON_BUNDLE', false)
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

}

module.exports.EnvironmentVariablesReader = EnvironmentVariablesReader;
