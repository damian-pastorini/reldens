/**
 *
 * Reldens - AdminManager
 *
 */

const { AdminTranslations } = require('./admin-translations');
const { AdminEntitiesGenerator } = require('./admin-entities-generator');
const { AdminManagerConfig } = require('./admin-manager-config');
const { AdminEntitiesRoutesGenerator } = require('./admin-entities-routes-generator');
const { AdminEntitiesTemplatesBuilder } = require('./admin-entities-templates-builder');
const { Logger, sc } = require('@reldens/utils');

class AdminManager
{

    adminEntitiesGenerator = null;
    adminEntitiesRoutesGenerator = null;
    adminEntitiesTemplatesBuilder = null;
    dataServerConfig = null;
    dataServer = null;
    events = null;
    loginManager = null;
    app = null;
    applicationFramework = null;
    session = null;
    gameServer = null;
    config = null;
    themeManager = null;
    secret = '';
    useSecureLogin = false;
    rootPath = '';
    adminRoleId = null;
    buildAdminCssOnActivation = null;
    bucket = null;

    constructor(adminManagerConfig)
    {
        if(!(adminManagerConfig instanceof AdminManagerConfig)){
            Logger.error('The adminManagerConfig param must be an instance of AdminManagerConfig.');
            return false;
        }
        if(!adminManagerConfig.validate()){
            return false;
        }
        adminManagerConfig.assignProperties(this);
        this.adminEntitiesGenerator = new AdminEntitiesGenerator();
        this.adminEntitiesRoutesGenerator = new AdminEntitiesRoutesGenerator({app: this.app});
        this.adminEntitiesTemplatesBuilder = new AdminEntitiesTemplatesBuilder({themeManager: this.themeManager});
    }

    async setupAdmin()
    {
        this.secret = (process.env.RELDENS_ADMIN_SECRET || '').toString();
        this.useSecureLogin = Boolean(Number(process.env.RELDENS_ADMIN_SECURE_LOGIN || 0) || false);
        this.rootPath = process.env.RELDENS_ADMIN_ROUTE_PATH || '/reldens-admin';
        this.logoutPath = '/logout';
        this.loginPath = '/login';
        let entities = this.adminEntitiesGenerator.generate(
            this.dataServerConfig.loadedEntities,
            this.dataServer.entityManager.entities
        );
        this.dataServer.resources = this.prepareResources(entities);
        this.adminRoleId = this.config.get('server/admin/roleId', 1);
        this.buildAdminCssOnActivation = this.config.getWithoutLogs('server/admin/buildAdminCssOnActivation', true);
        this.bucket = this.themeManager.projectThemePath;
        this.translations = this.dataServerConfig?.translations || {};
        this.branding = {
            companyName: this.config.getWithoutLogs('server/admin/companyName', 'Reldens - Administration Panel'),
            logo: this.config.getWithoutLogs('server/admin/logoPath', '/assets/web/reldens-your-logo-mage.png'),
            favicon: this.config.getWithoutLogs('server/admin/faviconPath', '/assets/web/favicon.ico'),
        };
        this.locale = {
            translations: AdminTranslations.appendTranslations(this.translations)
        };
        this.assets = {
            styles: [this.config.getWithoutLogs('server/admin/stylesPath', '/css/reldens-admin.css')],
        };
        this.setupAdminRoutes();
        this.adminEntitiesRoutesGenerator.generate(entities);
        await this.adminEntitiesTemplatesBuilder.build(entities);
        await this.buildAdminCss();
    }

    async buildAdminCss()
    {
        if(!this.buildAdminCssOnActivation){
            return;
        }
        await this.themeManager.buildAdminCss();
    }

    prepareResources(rawResources)
    {
        let rawResourcesKeys = Object.keys(rawResources);
        if(!rawResources || 0 === rawResourcesKeys.length){
            return [];
        }
        let registeredResources = [];
        for(let i of rawResourcesKeys){
            let rawResource = rawResources[i];
            let driverResource = {
                resource: {},
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

    setupAdminRoutes()
    {
        // apply session middleware only to /admin routes:
        let adminRouter = this.applicationFramework.Router();
        adminRouter.use(this.session({
            secret: this.secret,
            resave: false,
            saveUninitialized: true
        }));
        // route for the login page:
        adminRouter.get(this.loginPath, (req, res) => {
            return res.send('login');
        });
        // route for handling login:
        adminRouter.post(this.loginPath, async (req, res) => {
            const { email, password } = req.body;
            let loginResult = await this.loginManager.roleAuthenticationCallback(email, password, this.adminRoleId);
            if(loginResult){
                req.session.user = loginResult.username;
                return res.redirect(this.rootPath);
            }
            return res.redirect(this.rootPath+this.loginPath);
        });
        // route for the admin panel:
        adminRouter.get('/', this.isAuthenticated.bind(this), (req, res) => {
            return res.send('admin');
        });
        // route for logging out:
        adminRouter.get(this.logoutPath, (req, res) => {
            req.session.destroy();
            res.redirect(this.rootPath+this.loginPath);
        });
        // apply the adminRouter to the /admin path:
        this.app.use(this.rootPath, adminRouter);
    }

    isAuthenticated(req, res, next)
    {
        if(req.session.user){
            return next();
        }
        res.redirect(this.rootPath+this.loginPath);
    }

}

module.exports.AdminManager = AdminManager;
