/**
 *
 * Reldens - CreateAdminSubscriber
 *
 * Subscriber that handles the creation and initialization of the admin panel.
 * Configures entities, templates, authentication, and branding for the administration interface.
 *
 */

const { AdminManager } = require('@reldens/cms/lib/admin-manager');
const { PasswordEncryptionHandler } = require('@reldens/cms/lib/password-encryption-handler');
const { AdminManagerValidator } = require('@reldens/cms/lib/admin-manager-validator');
const { AdminEntitiesGenerator } = require('@reldens/cms/lib/admin-entities-generator');
const { AdminTemplatesLoader } = require('@reldens/cms/lib/admin-templates-loader');
const { AdminDistHelper } = require('@reldens/cms/lib/admin-dist-helper');
const { DefaultTranslations } = require('@reldens/cms/lib/admin-manager/default-translations');
const { MimeTypes } = require('../../../game/mime-types');
const { GameConst } = require('../../../game/constants');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../../game/server/manager').ServerManager} ServerManager
 * @typedef {import('../../../game/server/theme-manager').ThemeManager} ThemeManager
 * @typedef {import('../../../config/server/manager').ConfigManager} ConfigManager
 */
class CreateAdminSubscriber
{

    /**
     * @param {Object} event
     * @returns {Promise<boolean|void>}
     */
    async activateAdmin(event)
    {
        let serverManager = sc.get(event, 'serverManager', false);
        if(!this.validate(serverManager)){
            return false;
        }
        let entitiesGenerator = new AdminEntitiesGenerator();
        serverManager.events.emit('reldens.beforeCreateAdminManager', {serverManager});
        let dataServerConfig = serverManager.dataServerConfig;
        let dataServer = serverManager.dataServer;
        let themeManager = serverManager.themeManager;
        let adminFilesContents = await AdminTemplatesLoader.fetchAdminFilesContents(themeManager.adminTemplates);
        let securityConfig = serverManager.loginManager.securityConfig;
        let adminConfig = {
            events: serverManager.events,
            dataServer,
            authenticationCallback: serverManager.loginManager.roleAuthenticationCallback.bind(
                serverManager.loginManager
            ),
            app: serverManager.app,
            appServerFactory: serverManager.appServerFactory,
            entities: entitiesGenerator.generate(dataServerConfig.loadedEntities, dataServer.entityManager.entities),
            validator: new AdminManagerValidator(),
            autoSyncDistCallback: AdminDistHelper.copyBucketFilesToDist,
            updateAdminAssetsDistOnActivation: themeManager.copyAdminAssetsToDist.bind(themeManager),
            renderCallback: (content, params) => themeManager.templateEngine.render(content, params),
            secret: serverManager.configServer.admin.secret,
            sessionCookieSameSite: securityConfig.adminSession.sameSite,
            sessionCookieMaxAge: securityConfig.adminSession.maxAgeMs,
            sessionRolling: securityConfig.adminSession.rolling,
            csrfEnabled: securityConfig.adminCsrf.enabled,
            csrfIgnoredPaths: ['/tileset-analyzer'],
            rootPath: serverManager.configServer.admin.routePath,
            translations: sc.deepMergeProperties(
                sc.deepJsonClone(DefaultTranslations),
                sc.get(dataServerConfig, 'translations', {})
            ),
            adminFilesContents,
            mimeTypes: MimeTypes,
            allowedExtensions: {
                audio: ['.aac', '.mid', '.midi', '.mp3', '.ogg', '.oga', '.opus', '.wav', '.weba', '.3g2'],
                image: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'],
                text: ['.json', '.jsonld', '.txt']
            },
            ...sc.deepMergeProperties(
                this.fetchConfigurations(serverManager.configManager),
                await this.fetchFilesContents(themeManager)
            )
        };
        if(!adminConfig.adminRoleId){
            Logger.critical(
                'Administration panel not activated, the "server/admin/roleId" configuration is missing or zero.'
            );
            return false;
        }
        this.passwordEncryptionHandler = new PasswordEncryptionHandler({events: serverManager.events});
        this.passwordEncryptionHandler.registerEventListeners();
        serverManager.events.on('reldens.setupAdminRouter', (routerEvent) => {
            this.applyLoginRateLimit(routerEvent.adminManager, serverManager);
            this.applyCsrfTokenCookie(routerEvent.adminManager, securityConfig.adminCsrf.enabled);
        });
        serverManager.serverAdmin = new AdminManager(adminConfig);
        serverManager.events.emit('reldens.beforeSetupAdminManager', {serverManager});
        await serverManager.serverAdmin.setupAdmin();
        serverManager.events.emit('reldens.afterCreateAdminManager', {serverManager});
    }

    /**
     * @param {Object} adminManager
     * @param {ServerManager} serverManager
     * @returns {boolean}
     */
    applyLoginRateLimit(adminManager, serverManager)
    {
        let rateLimitConfigurer = serverManager.appServerFactory?.rateLimitConfigurer;
        if(!rateLimitConfigurer){
            Logger.error('The rate limit configurer is not available for the administration panel login.');
            return false;
        }
        let adminLoginConfig = serverManager.loginManager.securityConfig.adminLogin;
        adminManager.router.adminRouter.post(adminManager.loginPath, rateLimitConfigurer.createLimiter({
            windowMs: adminLoginConfig.windowMs,
            maxRequests: adminLoginConfig.maxAttempts,
            skipSuccessfulRequests: true,
            requestWasSuccessful: (request, response) => {
                return -1 === String(response.getHeader('Location')).indexOf('login-error=true');
            },
            keyGenerator: (request) => {
                return rateLimitConfigurer.rateLimit.ipKeyGenerator(request.ip)
                    +':'+String(sc.get(request.body, 'email', '')).toLowerCase();
            }
        }));
        return true;
    }

    /**
     * @param {Object} adminManager
     * @param {boolean} csrfEnabled
     * @returns {boolean}
     */
    applyCsrfTokenCookie(adminManager, csrfEnabled)
    {
        if(!csrfEnabled){
            return false;
        }
        adminManager.router.adminRouter.use((request, response, next) => {
            let csrfToken = sc.get(request.session, 'csrfToken', '');
            if('' !== csrfToken){
                response.cookie(GameConst.ADMIN_CSRF_TOKEN_COOKIE, csrfToken, {
                    path: adminManager.rootPath,
                    sameSite: 'strict',
                    secure: request.secure
                });
            }
            return next();
        });
        return true;
    }

    /**
     * @param {ServerManager|false} serverManager
     * @returns {boolean}
     */
    validate(serverManager)
    {
        if(!serverManager){
            Logger.error('ServerManager not found in CreateAdminSubscriber.');
            return false;
        }
        if(!serverManager.events){
            Logger.error('EventsManager not found in CreateAdminSubscriber.');
            return false;
        }
        if(!serverManager.themeManager){
            Logger.error('ThemeManager not found in CreateAdminSubscriber.');
            return false;
        }
        if(!serverManager.configManager){
            Logger.error('ConfigManager not found in CreateAdminSubscriber.');
            return false;
        }
        return true;
    }

    /**
     * @param {ConfigManager} config
     * @returns {Object}
     */
    fetchConfigurations(config)
    {
        let path = 'server/admin/';
        return {
            adminRoleId: Number(config.getWithoutLogs(path+'roleId', 0)),
            stylesFilePath: config.getWithoutLogs(path+'stylesPath', '/css/'+GameConst.STRUCTURE.ADMIN_CSS_FILE),
            scriptsFilePath: config.getWithoutLogs(path+'scriptsPath', '/'+GameConst.STRUCTURE.ADMIN_JS_FILE),
            branding: {
                companyName: config.getWithoutLogs(path+'companyName', 'Reldens - Administration Panel'),
                logo: config.getWithoutLogs(path+'logoPath', '/assets/web/reldens-your-logo-mage.png'),
                favicon: config.getWithoutLogs(path+'faviconPath', '/assets/web/favicon.ico'),
                copyRight: config.getWithoutLogs(path+'copyRight', '')
            }
        };
    }

    /**
     * @param {ThemeManager} themeManager
     * @returns {Promise<Object>}
     */
    async fetchFilesContents(themeManager)
    {
        return {
            branding: {
                copyRight: await FileHandler.fetchFileContents(
                    FileHandler.joinPaths(
                        themeManager.projectAdminTemplatesPath,
                        themeManager.adminTemplatesList.defaultCopyRight
                    )
                )
            }
        }
    }

}

module.exports.CreateAdminSubscriber = CreateAdminSubscriber;
