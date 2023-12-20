/**
 *
 * Reldens - AdminManager
 *
 */

const { DriverDatabase } = require('./driver-database');
const { DriverResource } = require('./driver-resource');
const { AdminTranslations } = require('./admin-translations');
const AdminJS = require('adminjs');
const AdminJSExpress = require('@adminjs/express');
const { Logger, sc } = require('@reldens/utils');

class AdminManager
{
    router = false;
    adminJs = false;
    pagesHandlers = {};

    constructor(props)
    {
        this.events = props.events;
        this.app = props.app;
        this.config = props.config;
        this.configManager = props.configManager;
        this.databases = sc.get(props, 'databases', []);
        this.translations = sc.get(props, 'translations', {});
        this.useSecureLogin = Boolean(Number(process.env.RELDENS_ADMIN_SECURE_LOGIN || 0) || false);
        this.authenticateCallback = sc.get(props, 'authenticateCallback', () => {
            Logger.info('Authenticate callback undefined.')
        });
        this.authCookiePassword = (process.env.ADMIN_COOKIE_PASSWORD || 'secret-password-to-secure-the-admin-cookie');
        this.dashboardComponent = sc.get(props, 'dashboardComponent', false);
        this.rootPath = sc.get(props, 'rootPath', (process.env.RELDENS_ADMIN_ROUTE_PATH || '/reldens-admin'));
        this.setupPagesHandlers(props);
    }

    setupAdmin()
    {
        AdminJS.registerAdapter({
            Database: DriverDatabase,
            Resource: DriverResource
        });
        AdminJS.bundle('./components/sidebar-override', 'Sidebar');
        let adminJsConfig = {
            databases: this.databases,
            rootPath: this.rootPath,
            logoutPath: this.rootPath+'/logout',
            loginPath: this.rootPath+'/login',
            branding: {
                companyName: this.configManager.getWithoutLogs(
                    'server/admin/companyName',
                    'Reldens - Administration Panel'
                ),
                softwareBrothers: false,
                logo: this.configManager.getWithoutLogs(
                    'server/admin/logoPath',
                    '/assets/web/reldens-your-logo-mage.png'
                ),
                favicon: this.configManager.getWithoutLogs('server/admin/faviconPath', '/assets/web/favicon.ico'),
            },
            locale: {
                translations: AdminTranslations.appendTranslations(this.translations)
            },
            assets: {
                styles: [this.configManager.getWithoutLogs('server/admin/stylesPath', '/css/reldens-admin.css')],
            },
            dashboard: {
                handler: () => {
                    return { manager: this }
                },
                component: this.dashboardComponent || AdminJS.bundle('./components/dashboard')
            },
            pages: {
                management: {
                    icon: 'Settings',
                    handler: this.pagesHandlers['management'],
                    component: AdminJS.bundle('./components/management'),
                }
            }
        };
        this.events.emit('reldens.beforeAdminJs', {adminManager: this, adminJsConfig});
        this.adminJs = new AdminJS(adminJsConfig);
        this.createRouter();
        this.events.emit('reldens.afterAdminJs', {adminManager: this});
    }

    createRouter()
    {
        let rootPath = (this.adminJs.options.rootPath || '').toString();
        if ('' === rootPath) {
            Logger.critical('AdminJS rootPath must be defined.');
            return false;
        }
        let pathEnd = rootPath.charAt(rootPath.length - 1);
        let oppositePath = '/' !== pathEnd ? rootPath+'/' : rootPath.slice(0, -1);
        let pathJoin = pathEnd === '/' ? '' : '/';
        let loginRoute = rootPath+pathJoin+'login';
        this.app.get(oppositePath, (req, res, next) => {
            if(oppositePath === req._parsedUrl.pathname){
                return res.redirect(loginRoute);
            }
            return next();
        });
        this.app.post(oppositePath, (req, res, next) => {
            if(oppositePath === req._parsedUrl.pathname){
                return res.redirect(loginRoute);
            }
            return next();
        });
        this.router = !this.useSecureLogin
            ? AdminJSExpress.buildRouter(this.adminJs)
            : AdminJSExpress.buildAuthenticatedRouter(
                this.adminJs,
                {authenticate: this.authenticateCallback, cookiePassword: this.authCookiePassword},
                null,
                {resave: true, saveUninitialized: true}
            );
        this.app.use(rootPath, this.router);
    }

    static prepareResources(rawResources)
    {
        let rawResourcesKeys = Object.keys(rawResources);
        if(!rawResources || 0 === rawResourcesKeys.length){
            return [];
        }
        let registeredResources = [];
        for(let i of rawResourcesKeys){
            let rawResource = rawResources[i];
            let driverResource = {
                resource: new DriverResource(rawResource.rawEntity, rawResource.config),
                id: () => {
                    return rawResource.rawEntity.tableName();
                },
                options: {
                    navigation: sc.hasOwn(rawResource.config, 'parentItemLabel') ? {
                        name: rawResource.config.parentItemLabel,
                        icon: rawResource.config.icon || 'List'
                    } : null,
                    listProperties: rawResource.config.listProperties || [],
                    showProperties: rawResource.config.showProperties || [],
                    filterProperties: rawResource.config.filterProperties || [],
                    editProperties: rawResource.config.editProperties || [],
                    properties: rawResource.config.properties || [],
                    sort: sc.get(rawResource.config, 'sort', null)
                },
                features: sc.get(rawResource.config, 'features', [])
            };
            registeredResources.push(driverResource);
        }
        return registeredResources;
    }

    setupPagesHandlers(props)
    {
        this.pagesHandlers['management'] = async (request, response, context) => {
            let result = {};
            if(request.query.buildClient){
                let themeManager = props.serverManager.themeManager;
                await themeManager.buildClient();
                result.buildClient = true;
            }
            if(request.query.shootDownServer){
                await props.serverManager.gameServer.gracefullyShutdown();
                result.shootDownServer = true; // you will never reach this :)
            }
            return {result};
        };
    }

}

module.exports.AdminManager = AdminManager;
