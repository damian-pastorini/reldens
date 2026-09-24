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
            baseUrl: host+':'+port,
            publicUrl,
            security: this.fetchSecurityFromEnvironmentVariables(),
            rooms: {
                validateRoomsOriginRequest: EnvVar.boolean(process.env, 'RELDENS_VALIDATE_ROOMS_ORIGIN', false),
                allowRequestsWithoutOrigin: EnvVar.boolean(process.env, 'RELDENS_ALLOW_REQUESTS_WITHOUT_ORIGIN', true)
            },
            mailer: {forgotPasswordLimit: EnvVar.number(process.env, 'RELDENS_MAILER_FORGOT_PASSWORD_LIMIT', 4)},
            admin: this.fetchAdminFromEnvironmentVariables(),
            firebase: this.fetchFirebaseFromEnvironmentVariables(),
            prismaAdapter: this.fetchPrismaAdapterFromEnvironmentVariables(),
            tilesetAnalyzer: this.fetchTilesetAnalyzerFromEnvironmentVariables(),
            monitor: this.fetchMonitorFromEnvironmentVariables()
        };
        Logger.info('Server environment configuration:', {
            ...environmentConfig,
            appServerConfig: sc.omitProps(environmentConfig.appServerConfig, ['passphrase']),
            security: sc.omitProps(environmentConfig.security, ['signedTokensSecret']),
            admin: sc.omitProps(environmentConfig.admin, ['secret']),
            tilesetAnalyzer: sc.omitProps(environmentConfig.tilesetAnalyzer, ['requirements']),
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
            signedTokensSecret: EnvVar.nonEmptyString(
                process.env,
                'RELDENS_SIGNED_TOKENS_SECRET',
                EnvVar.nonEmptyString(process.env, 'RELDENS_ADMIN_SECRET', '')
            ),
            passwordMinimumLength: EnvVar.number(process.env, 'RELDENS_PASSWORD_MINIMUM_LENGTH', 3),
            passwordMaximumLength: EnvVar.number(process.env, 'RELDENS_PASSWORD_MAXIMUM_LENGTH', 128),
            maxConcurrentPasswordValidations: EnvVar.number(
                process.env,
                'RELDENS_MAX_CONCURRENT_PASSWORD_VALIDATIONS',
                8
            ),
            loginAttempts: {
                enabled: EnvVar.boolean(process.env, 'RELDENS_LOGIN_ATTEMPTS_ENABLED', true),
                maxAttempts: EnvVar.number(process.env, 'RELDENS_LOGIN_ATTEMPTS_MAX', 10),
                blockTimeMs: EnvVar.number(process.env, 'RELDENS_LOGIN_ATTEMPTS_BLOCK_MS', 900000)
            },
            registration: {
                maxPerIp: EnvVar.number(process.env, 'RELDENS_REGISTRATION_MAX_PER_IP', 10),
                usernameMinimumLength: EnvVar.number(process.env, 'RELDENS_USERNAME_MINIMUM_LENGTH', 3),
                usernameMaximumLength: EnvVar.number(process.env, 'RELDENS_USERNAME_MAXIMUM_LENGTH', 50),
                emailMaximumLength: EnvVar.number(process.env, 'RELDENS_EMAIL_MAXIMUM_LENGTH', 255)
            },
            guests: {maxPerIp: EnvVar.number(process.env, 'RELDENS_GUESTS_MAX_PER_IP', 20)},
            gameLogin: {
                windowMs: EnvVar.number(process.env, 'RELDENS_GAME_LOGIN_WINDOW_MS', 60000),
                maxJoins: EnvVar.number(process.env, 'RELDENS_GAME_LOGIN_MAX_JOINS', 20)
            },
            roomsLogin: {
                windowMs: EnvVar.number(process.env, 'RELDENS_ROOMS_LOGIN_WINDOW_MS', 60000),
                maxJoins: EnvVar.number(process.env, 'RELDENS_ROOMS_LOGIN_MAX_JOINS', 60)
            },
            adminLogin: {
                windowMs: EnvVar.number(process.env, 'RELDENS_ADMIN_LOGIN_WINDOW_MS', 900000),
                maxAttempts: EnvVar.number(process.env, 'RELDENS_ADMIN_LOGIN_MAX_ATTEMPTS', 5)
            },
            adminSession: {
                maxAgeMs: EnvVar.number(process.env, 'RELDENS_ADMIN_SESSION_MAX_AGE_MS', 86400000),
                sameSite: EnvVar.nonEmptyString(process.env, 'RELDENS_ADMIN_SESSION_SAME_SITE', 'lax'),
                rolling: EnvVar.boolean(process.env, 'RELDENS_ADMIN_SESSION_ROLLING', false)
            },
            adminCsrf: {enabled: EnvVar.boolean(process.env, 'RELDENS_ADMIN_CSRF_ENABLED', true)},
            guestsCleanup: {
                enabled: EnvVar.boolean(process.env, 'RELDENS_GUESTS_CLEANUP_ENABLED', false),
                afterMs: EnvVar.number(process.env, 'RELDENS_GUESTS_CLEANUP_AFTER_MS', 604800000),
                intervalMs: EnvVar.number(process.env, 'RELDENS_GUESTS_CLEANUP_INTERVAL_MS', 3600000)
            }
        };
    }

    static fetchAdminFromEnvironmentVariables()
    {
        return {
            secret: EnvVar.nonEmptyString(process.env, 'RELDENS_ADMIN_SECRET', ''),
            routePath: EnvVar.nonEmptyString(process.env, 'RELDENS_ADMIN_ROUTE_PATH', '/reldens-admin')
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

    static fetchPrismaAdapterFromEnvironmentVariables()
    {
        return {
            packageName: EnvVar.nonEmptyString(process.env, 'RELDENS_PRISMA_ADAPTER', '@prisma/adapter-mariadb'),
            className: EnvVar.nonEmptyString(process.env, 'RELDENS_PRISMA_ADAPTER_CLASS', 'PrismaMariaDb')
        };
    }

    static fetchTilesetAnalyzerFromEnvironmentVariables()
    {
        return {
            skipAi: EnvVar.boolean(process.env, 'RELDENS_TILESET_SKIP_AI', false),
            showAiControls: EnvVar.boolean(process.env, 'RELDENS_TILESET_SHOW_AI_CONTROLS', false),
            requirements: {
                ollamaHost: EnvVar.string(process.env, 'RELDENS_TILESET_OLLAMA_HOST', ''),
                ollamaModel: EnvVar.string(process.env, 'RELDENS_TILESET_OLLAMA_MODEL', 'qwen2.5vl:7b'),
                ollamaAvailableModels: EnvVar.string(process.env, 'RELDENS_TILESET_OLLAMA_AVAILABLE_MODELS', ''),
                anthropicApiKey: EnvVar.string(process.env, 'ANTHROPIC_API_KEY', null),
                geminiApiKey: EnvVar.string(process.env, 'GEMINI_API_KEY', null)
            },
            analyzer: {
                claudeModel: EnvVar.string(process.env, 'RELDENS_TILESET_CLAUDE_MODEL', 'claude-sonnet-4-6'),
                claudeMaxTokens: EnvVar.number(process.env, 'RELDENS_TILESET_CLAUDE_MAX_TOKENS', 512),
                claudeMaxTokensDetection: EnvVar.number(
                    process.env,
                    'RELDENS_TILESET_CLAUDE_MAX_TOKENS_DETECTION',
                    4096
                ),
                geminiModel: EnvVar.string(
                    process.env,
                    'RELDENS_TILESET_GEMINI_MODEL',
                    'gemini-2.0-flash-preview-image-generation'
                ),
                geminiMaxTokens: EnvVar.number(process.env, 'RELDENS_TILESET_GEMINI_MAX_TOKENS', 512),
                geminiMaxTokensDetection: EnvVar.number(
                    process.env,
                    'RELDENS_TILESET_GEMINI_MAX_TOKENS_DETECTION',
                    4096
                ),
                ollamaHost: EnvVar.string(process.env, 'RELDENS_TILESET_OLLAMA_HOST', ''),
                ollamaNumCtx: EnvVar.number(process.env, 'RELDENS_TILESET_OLLAMA_NUM_CTX', 8192),
                ollamaNumPredict: EnvVar.number(process.env, 'RELDENS_TILESET_OLLAMA_NUM_PREDICT', 2000),
                minClusterTiles: EnvVar.number(process.env, 'RELDENS_TILESET_MIN_CLUSTER_TILES', 1),
                maxClusterTiles: EnvVar.number(process.env, 'RELDENS_TILESET_MAX_CLUSTER_TILES', 30),
                clusterColorDistance: EnvVar.number(process.env, 'RELDENS_TILESET_CLUSTER_COLOR_DISTANCE', 30),
                clusterVarianceThreshold: EnvVar.number(process.env, 'RELDENS_TILESET_CLUSTER_VARIANCE_THRESHOLD', 600),
                clusterMinTileFillPct: EnvVar.number(process.env, 'RELDENS_TILESET_CLUSTER_MIN_TILE_FILL_PCT', 10),
                clusterSplitByGap: EnvVar.number(process.env, 'RELDENS_TILESET_CLUSTER_SPLIT_BY_GAP', 1),
                elementBorderColorDistance: EnvVar.number(
                    process.env,
                    'RELDENS_TILESET_ELEMENT_BORDER_COLOR_DISTANCE',
                    20
                ),
                validatePass: EnvVar.boolean(process.env, 'RELDENS_TILESET_VALIDATE_PASS', false)
            }
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
