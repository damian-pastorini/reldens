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
const { TemplatesList } = require('./templates-list');
const { FileHandler } = require('../../game/server/file-handler');
const { Logger, sc } = require('@reldens/utils');

class AdminManager
{

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
        this.entities = this.adminEntitiesGenerator.generate(
            this.dataServerConfig.loadedEntities,
            this.dataServer.entityManager.entities
        );
        this.dataServer.resources = this.prepareResources(this.entities);
        this.adminRoleId = this.config.get('server/admin/roleId', 1);
        this.buildAdminCssOnActivation = this.config.getWithoutLogs('server/admin/buildAdminCssOnActivation', true);
        this.bucket = this.themeManager.projectThemePath;
        this.translations = AdminTranslations.appendTranslations(this.dataServerConfig?.translations || {});
        this.branding = {
            companyName: this.config.getWithoutLogs('server/admin/companyName', 'Reldens - Administration Panel'),
            logo: this.config.getWithoutLogs('server/admin/logoPath', '/assets/web/reldens-your-logo-mage.png'),
            favicon: this.config.getWithoutLogs('server/admin/faviconPath', '/assets/web/favicon.ico'),
            copyRight: this.config.getWithoutLogs(
                'server/admin/copyRight',
                '<div class="copyright">'
                +'<a href="https://www.dwdeveloper.com/">'
                +'by D<span class="text-black text-lowercase">w</span><span class="text-capitalize">Developer</span>'
                +'</a>'
                +'</div>'
            )
        };
        this.stylesFilePath = this.config.getWithoutLogs('server/admin/stylesPath', '/css/reldens-admin.css');
        FileHandler.createFolder(this.themeManager.adminPath);
        this.adminFilesContents = await this.fetchAdminFilesContents(this.themeManager.adminTemplates);
        if(!this.adminFilesContents){
            return;
        }
        this.sideBarContent = await this.buildSideBar();
        await this.buildAdminTemplates();
        await this.adminEntitiesTemplatesBuilder.build(this.translations, this.dataServer.resources);
        await this.buildAdminCss();
        this.setupAdminRoutes();
        this.adminEntitiesRoutesGenerator.generate(this);
    }

    async buildSideBar()
    {
        let navigationContents = {};
        for(let driverResource of this.dataServer.resources){
            let navigation = driverResource.options?.navigation;
            let name = this.translations.labels[driverResource.id()];
            let path = this.rootPath+'/'+(driverResource.id().replace(/_/g, '-'));
            if(navigation?.name){
                if(!navigationContents[navigation.name]){
                    navigationContents[navigation.name] = {};
                }
                navigationContents[navigation.name][driverResource.id()] = await this.themeManager.templateEngine.render(
                    this.adminFilesContents.sidebarItem,
                    {name, path}
                );
                continue;
            }
            navigationContents[driverResource.id()] = await this.themeManager.templateEngine.render(
                this.adminFilesContents.sidebarItem,
                {name, path}
            );
        }
        let navigationView = '';
        for(let id of Object.keys(navigationContents)){
            if(sc.isObject(navigationContents[id])){
                let subItems = '';
                for(let subId of Object.keys(navigationContents[id])){
                    subItems += navigationContents[id][subId];
                }
                navigationView += await this.themeManager.templateEngine.render(
                    this.adminFilesContents.sidebarHeader,
                    {name: id, subItems}
                )
                continue;
            }
            navigationView += navigationContents[id];
        }
        return navigationView;
    }

    async buildAdminTemplates()
    {
        await this.saveRenderInFile(this.adminFilesContents.login, '', TemplatesList.login);
        await this.saveRenderInFile(this.adminFilesContents.dashboard, this.sideBarContent, TemplatesList.dashboard);
    }

    async saveRenderInFile(pageContent, sideBarContent, fileName)
    {
        let content = await this.themeManager.templateEngine.render(
            this.adminFilesContents.layout,
            {
                sideBarContent,
                pageContent,
                stylesFilePath: this.stylesFilePath,
                brandingCompanyName: this.branding.companyName,
                copyRight: this.branding.copyRight
            }
        );
        await FileHandler.updateFileContents(this.buildAdminFilePath(fileName), content);
    }

    buildAdminFilePath(file)
    {
        return FileHandler.joinPaths(this.themeManager.adminPath, file);
    }

    async fetchAdminFilesContents(adminTemplates)
    {
        let adminFilesContents = {};
        for(let template of Object.keys(adminTemplates)){
            let templateData = adminTemplates[template];
            if(sc.isObject(templateData)){
                let subFoldersContents = await this.fetchAdminFilesContents(templateData);
                if(!subFoldersContents){
                    return false;
                }
                adminFilesContents[template] = subFoldersContents;
                continue;
            }
            if(!FileHandler.isFile(templateData)){
                Logger.critical('Admin template file not found.', template);
                return false;
            }
            adminFilesContents[template] = await FileHandler.fetchFileContents(templateData);
        }
        return adminFilesContents;
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
            };
            registeredResources.push(driverResource);
        }
        return registeredResources;
    }

    setupAdminRoutes()
    {
        // apply session middleware only to /admin routes:
        this.adminRouter = this.applicationFramework.Router();
        this.adminRouter.use(this.session({
            secret: this.secret,
            resave: false,
            saveUninitialized: true
        }));
        // route for the login page:
        this.adminRouter.get(this.loginPath, (req, res) => {
            return res.sendFile(this.buildAdminFilePath(TemplatesList.login));
        });
        // route for handling login:
        this.adminRouter.post(this.loginPath, async (req, res) => {
            const { email, password } = req.body;
            let loginResult = await this.loginManager.roleAuthenticationCallback(email, password, this.adminRoleId);
            if(loginResult){
                req.session.user = loginResult.username;
                return res.redirect(this.rootPath);
            }
            return res.redirect(this.rootPath+this.loginPath);
        });
        // route for the admin panel:
        this.adminRouter.get('/', this.isAuthenticated.bind(this), (req, res) => {
            return res.sendFile(this.buildAdminFilePath(TemplatesList.dashboard));
        });
        // route for logging out:
        this.adminRouter.get(this.logoutPath, (req, res) => {
            req.session.destroy();
            res.redirect(this.rootPath+this.loginPath);
        });
        // apply the adminRouter to the /admin path:
        this.app.use(this.rootPath, this.adminRouter);
    }

    isAuthenticated(req, res, next)
    {
        if(req.session?.user){
            return next();
        }
        res.redirect(this.rootPath+this.loginPath);
    }

}

module.exports.AdminManager = AdminManager;
