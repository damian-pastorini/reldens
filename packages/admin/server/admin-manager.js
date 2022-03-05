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

    constructor(props)
    {
        this.app = props.app;
        this.config = props.config;
        this.databases = sc.get(props, 'databases', []);
        this.translations = sc.get(props, 'translations', {});
        this.useSecureLogin = Boolean(Number(process.env.RELDENS_ADMIN_SECURE_LOGIN || 0) || false);
        this.authenticateCallback = sc.get(props, 'authenticateCallback', () => {
            Logger.info('Authenticate callback undefined.')
        });
        this.authCookiePassword = (process.env.ADMIN_COOKIE_PASSWORD || 'secret-password-to-secure-the-admin-cookie');
        this.dashboardComponent = sc.get(props, 'dashboardComponent', false);
        this.rootPath = sc.get(props, 'rootPath', (process.env.RELDENS_ADMIN_ROUTE_PATH || '/reldens-admin'));
    }

    setupAdmin()
    {
        AdminJS.registerAdapter({
            Database: DriverDatabase,
            Resource: DriverResource
        });
        let adminJsConfig = {
            databases: this.databases,
            rootPath: this.rootPath,
            logoutPath: this.rootPath+'/logout',
            loginPath: this.rootPath+'/login',
            branding: {
                companyName: (process.env.RELDENS_ADMIN_COMPANY_NAME || 'Reldens - Administration Panel'),
                softwareBrothers: false,
                logo: (process.env.RELDENS_ADMIN_LOGO_PATH || '/assets/web/reldens-your-logo-mage.png'),
            },
            locale: {
                translations: AdminTranslations.appendTranslations(this.translations)
            },
            assets: {
                styles: [(process.env.RELDENS_ADMIN_STYLES_PATH || '/css/reldens-admin.css')],
            },
            dashboard: {
                handler: () => {
                    return { manager: this }
                },
                component: this.dashboardComponent || AdminJS.bundle('./dashboard-component')
            },
        };
        this.adminJs = new AdminJS(adminJsConfig);
        this.router = this.createRouter();
        this.app.use(this.adminJs.options.rootPath, this.router);
    }

    createRouter()
    {
        return !this.useSecureLogin ? AdminJSExpress.buildRouter(this.adminJs)
            : AdminJSExpress.buildAuthenticatedRouter(
                this.adminJs,
                {authenticate: this.authenticateCallback, cookiePassword: this.authCookiePassword},
                null,
                {resave: true, saveUninitialized: true}
            );
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

}

module.exports.AdminManager = AdminManager;
