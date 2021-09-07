/**
 *
 * Reldens - AdminManager
 *
 */

const { ObjectionDriverDatabase } = require('./objection-driver-database');
const { ObjectionDriverResource } = require('./objection-driver-resource');
const AdminJS = require('adminjs');
const AdminJSExpress = require('@adminjs/express');
const { sc } = require('@reldens/utils');

class AdminManager
{

    constructor(props)
    {
        this.app = props.app;
        this.config = props.config;
        this.databases = sc.getDef(props, 'databases', []);
        this.translations = sc.getDef(props, 'translations', {});
        this.router = false;
        this.adminJs = false;
        this.useSecureLogin = false;
        this.authenticateCallback = sc.getDef(props, 'authenticateCallback', () => { return true; });
    }

    setupAdmin()
    {
        AdminJS.registerAdapter({
            Database: ObjectionDriverDatabase,
            Resource: ObjectionDriverResource
        });
        this.rootPath = (process.env.ADMIN_ROUTE_PATH || '/reldens-admin');
        let adminJsConfig = {
            databases: this.databases,
            rootPath: this.rootPath,
            logoutPath: this.rootPath+'/logout',
            loginPath: this.rootPath+'/login',
            branding: {
                companyName: 'Reldens - Administration Panel',
                softwareBrothers: false,
                logo: '/assets/web/reldens-your-logo-mage.png',
            },
            locale: {
                translations: this.prepareTranslations()
            },
            assets: {
                styles: ['/css/reldens-admin.css'],
            },
            dashboard: {
                handler: async () => {},
                component: AdminJS.bundle('./dashboard-component')
            },
        };
        this.adminJs = new AdminJS(adminJsConfig);
        this.router = this.createRouter();
        this.app.use(this.adminJs.options.rootPath, this.router);
    }

    prepareTranslations()
    {
        let translations = {
            messages: {
                loginWelcome: 'Administration Panel - Login'
            },
            labels: {
                navigation: 'Reldens - Administration Panel',
                adminVersion: 'Admin: {{version}}',
                loginWelcome: 'Reldens'
            }
        };
        for(let i of Object.keys(this.translations)){
            if (!translations[i]) {
                translations[i] = {};
            }
            Object.assign(translations[i], this.translations[i]);
        }
        return translations;
    }

    createRouter()
    {
        return !this.useSecureLogin ? AdminJSExpress.buildRouter(this.adminJs)
            : AdminJSExpress.buildAuthenticatedRouter(this.adminJs, {
                authenticate: this.authenticateCallback,
                cookiePassword: (process.env.ADMIN_COOKIE_PASSWORD || 'secret-password-to-secure-the-admin-cookie')
            }
        );
    }

    static prepareResources(rawResources)
    {
        let registeredResources = [];
        if(!rawResources){
            return registeredResources;
        }
        let rawResourcesKeys = Object.keys(rawResources);
        if(rawResourcesKeys.length > 1){
            for(let i of rawResourcesKeys){
                let rawResource = rawResources[i];
                let objectionDriverResource = {
                    resource: new ObjectionDriverResource(rawResource.rawEntity, rawResource.config),
                    id: () => {
                        return rawResource.rawEntity.tableName
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
                        sort: sc.getDef(rawResource.config, 'sort', null)
                    },
                    features: sc.getDef(rawResource.config, 'features', [])
                };
                registeredResources.push(objectionDriverResource);
            }
        }
        return registeredResources;
    }

}

module.exports.AdminManager = AdminManager;
