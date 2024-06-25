/**
 *
 * Reldens - AdminManager
 *
 */

const { AdminTranslations } = require('./admin-translations');
const { AdminEntitiesGenerator } = require('./admin-entities-generator');
const { AdminManagerConfig } = require('./admin-manager-config');
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
    bodyParser = null;
    session = null;
    gameServer = null;
    config = null;
    themeManager = null;
    secret = '';
    useSecureLogin = false;
    rootPath = '';
    adminRoleId = null;
    buildAdminCssOnActivation = null;
    buckets = null;
    adminContents = {};

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
        this.logoutPath = '/logout';
        this.loginPath = '/login';
        this.viewPath = '/view';
        this.editPath = '/edit';
        this.savePath = '/save';
        this.adminEntitiesGenerator = new AdminEntitiesGenerator();
    }

    async setupAdmin()
    {
        this.secret = (process.env.RELDENS_ADMIN_SECRET || '').toString();
        this.useSecureLogin = Boolean(Number(process.env.RELDENS_ADMIN_SECURE_LOGIN || 0) || false);
        this.rootPath = process.env.RELDENS_ADMIN_ROUTE_PATH || '/reldens-admin';
        this.entities = this.adminEntitiesGenerator.generate(
            this.dataServerConfig.loadedEntities,
            this.dataServer.entityManager.entities
        );
        this.resources = this.prepareResources(this.entities);
        this.buckets = this.fetchThemesFolders();
        this.adminRoleId = this.config.get('server/admin/roleId', 1);
        this.buildAdminCssOnActivation = this.config.getWithoutLogs('server/admin/buildAdminCssOnActivation', true);
        this.translations = AdminTranslations.appendTranslations(this.dataServerConfig?.translations || {});
        this.stylesFilePath = this.config.getWithoutLogs('server/admin/stylesPath', '/css/reldens-admin.css');
        this.branding = {
            companyName: this.config.getWithoutLogs('server/admin/companyName', 'Reldens - Administration Panel'),
            logo: this.config.getWithoutLogs('server/admin/logoPath', '/assets/web/reldens-your-logo-mage.png'),
            favicon: this.config.getWithoutLogs('server/admin/faviconPath', '/assets/web/favicon.ico'),
            copyRight: this.config.getWithoutLogs(
                'server/admin/copyRight',
                await FileHandler.fetchFileContents(
                    FileHandler.joinPaths(
                        this.themeManager.reldensModuleAdminTemplatesPath,
                        this.themeManager.adminTemplatesList.defaultCopyRight
                    )
                )
            )
        };
        this.adminFilesContents = await this.fetchAdminFilesContents(this.themeManager.adminTemplates);
        if(!this.adminFilesContents){
            return;
        }
        await this.buildAdminContents();
        await this.buildAdminCss();
        this.setupAdminRoutes();
        this.setupEntitiesRoutes();
    }

    fetchThemesFolders()
    {
        let allFolders = FileHandler.fetchSubFoldersList(this.themeManager.themePath);
        let pluginsIndex = allFolders.indexOf('plugins');
        if(-1 !== pluginsIndex){
            allFolders.splice(pluginsIndex, 1);
        }
        return allFolders;
    }

    async buildAdminContents()
    {
        this.adminContents.layout = await this.buildLayout();
        this.adminContents.sideBar = await this.buildSideBar();
        this.adminContents.login = await this.buildLogin();
        this.adminContents.dashboard = await this.buildDashboard();
        this.adminContents.entities = await this.buildEntitiesContents();
    }

    async buildLayout()
    {
        return await this.themeManager.templateEngine.render(
            this.adminFilesContents.layout,
            {
                sideBar: '{{&sideBar}}',
                pageContent: '{{&pageContent}}',
                stylesFilePath: this.stylesFilePath,
                rootPath: this.rootPath,
                brandingCompanyName: this.branding.companyName,
                copyRight: this.branding.copyRight
            }
        );
    }

    async buildSideBar()
    {
        let navigationContents = {};
        for(let driverResource of this.resources){
            let navigation = driverResource.options?.navigation;
            let name = this.translations.labels[driverResource.id()] || this.translations.labels[driverResource.entityKey];
            let path = this.rootPath+'/'+(driverResource.id().replace(/_/g, '-'));
            if(navigation?.name){
                if(!navigationContents[navigation.name]){
                    navigationContents[navigation.name] = {};
                }
                navigationContents[navigation.name][driverResource.id()] = await this.themeManager.templateEngine.render(
                    this.adminFilesContents.sideBarItem,
                    {name, path}
                );
                continue;
            }
            navigationContents[driverResource.id()] = await this.themeManager.templateEngine.render(
                this.adminFilesContents.sideBarItem,
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
                    this.adminFilesContents.sideBarHeader,
                    {name: id, subItems}
                );
                continue;
            }
            navigationView += navigationContents[id];
        }
        return await this.themeManager.templateEngine.render(
            this.adminFilesContents.sideBar,
            {
                rootPath: this.rootPath,
                navigationView
            }
        );
    }

    async buildLogin()
    {
        return await this.themeManager.templateEngine.render(
            this.adminContents.layout,
            {
                sideBar: '',
                pageContent: this.adminFilesContents.login,
                stylesFilePath: this.stylesFilePath,
                brandingCompanyName: this.branding.companyName,
                copyRight: this.branding.copyRight
            }
        );
    }

    async buildDashboard()
    {
        return await this.themeManager.templateEngine.render(
            this.adminContents.layout,
            {
                sideBar: this.adminContents.sideBar,
                pageContent: this.adminFilesContents.dashboard,
                stylesFilePath: this.stylesFilePath,
                brandingCompanyName: this.branding.companyName,
                copyRight: this.branding.copyRight
            }
        );
    }

    async buildEntitiesContents()
    {
        let entitiesContents = {};
        for(let driverResource of this.resources){
            let title = this.translations.labels[driverResource.id()];
            let entityName = (driverResource.id().replace(/_/g, '-'));
            let entityListRoute = this.rootPath+'/'+entityName;
            let entityEditRoute = this.rootPath+'/'+entityName+this.editPath;
            let entitySaveRoute = this.rootPath+'/'+entityName+this.savePath;
            entitiesContents[entityName] = {
                list: await this.themeManager.templateEngine.render(
                    this.adminFilesContents.list,
                    {
                        entityName,
                        title,
                        entityListRoute,
                        filters: driverResource.options.filterProperties.map((property) => {
                            return {
                                name: property,
                                value: '{{&'+property+'}}'
                            };
                        }),
                        list: '{{&list}}',
                        pagination: '{{&pagination}}'
                    }
                ),
                view: await this.themeManager.templateEngine.render(
                    this.adminFilesContents.view,
                    {
                        entityName,
                        title,
                        fields: driverResource.options.showProperties.map((property) => {
                            return {
                                name: property,
                                value: '{{&'+property+'}}'
                            };
                        }),
                        entityListRoute,
                        entityEditRoute: '{{&entityEditRoute}}'
                    }
                ),
                edit: await this.themeManager.templateEngine.render(
                    this.adminFilesContents.edit,
                    {
                        entityName,
                        title,
                        entitySaveRoute,
                        editFields: '{{&editFields}}'
                    }
                )
            };
        }
        return entitiesContents;
    }

    async renderRoute(pageContent, sideBar)
    {
        return await this.themeManager.templateEngine.render(
            this.adminContents.layout,
            {
                stylesFilePath: this.stylesFilePath,
                brandingCompanyName: this.branding.companyName,
                copyRight: this.branding.copyRight,
                pageContent,
                sideBar
            }
        );
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
            let tableName = rawResource.rawEntity.tableName();
            let driverResource = {
                resource: {},
                id: () => {
                    return tableName;
                },
                entityKey: i,
                entityPath: (tableName.replace(/_/g, '-')),
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
        this.adminRouter.use(this.bodyParser.json());
        // route for the login page:
        this.adminRouter.get(this.loginPath, async (req, res) => {
            return res.send(this.adminContents.login);
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
        // route for the admin panel dashboard:
        this.adminRouter.get('/', this.isAuthenticated.bind(this), async (req, res) => {
            return res.send(this.adminContents.dashboard);
        });
        // route for logging out:
        this.adminRouter.get(this.logoutPath, (req, res) => {
            req.session.destroy();
            res.redirect(this.rootPath+this.loginPath);
        });
        // apply the adminRouter to the /admin path:
        this.app.use(this.rootPath, this.adminRouter);
    }

    setupEntitiesRoutes()
    {
        if(!this.resources || 0 === this.resources.length){
            return;
        }
        for(let driverResource of this.resources){
            let entityPath = driverResource.entityPath;
            let entityRoute = '/'+entityPath;
            this.adminRouter.get(entityRoute, this.isAuthenticated.bind(this), async (req, res) => {
                let routeContents = await this.generateListRouteContent(req, driverResource, entityPath);
                return res.send(routeContents);
            });
            this.adminRouter.post(entityRoute, this.isAuthenticated.bind(this), async (req, res) => {
                let routeContents = await this.generateListRouteContent(req, driverResource, entityPath);
                return res.send(routeContents);
            });
            this.adminRouter.get(entityRoute+this.viewPath, this.isAuthenticated.bind(this), async (req, res) => {
                let routeContents = await this.generateViewRouteContent(req, driverResource, entityPath);
                return res.send(routeContents);
            });
            this.adminRouter.get(entityRoute+this.editPath, this.isAuthenticated.bind(this), async (req, res) => {
                return res.send(await this.renderRoute(
                    this.adminContents.entities[entityPath].edit,
                    this.adminContents.sideBar
                ));
            });
            this.adminRouter.post(entityRoute+this.savePath, this.isAuthenticated.bind(this), async (req, res) => {
                return res.redirect(entityRoute+this.viewPath);
            });
        }
    }

    async generateViewRouteContent(req, driverResource, entityPath)
    {
        let entityRepository = this.dataServer.getEntity(driverResource.entityKey);
        let id = (req?.query?.id || '').toString();
        if('' === id){
            return '';
        }
        let loadedEntity = await entityRepository.loadById(id);
        let resourceProperties = driverResource.options?.properties;
        let idProperty = this.fetchEntityIdPropertyKey(resourceProperties);
        let renderedViewProperties = {
            entityEditRoute: this.generateEntityRoute('editPath', driverResource, idProperty, loadedEntity)
        };
        for(let propertyKey of await driverResource.options.showProperties){
            let rawConfigFilterProperties = driverResource.options.properties[propertyKey];
            renderedViewProperties[propertyKey] = await this.themeManager.templateEngine.render(
                this.adminFilesContents.fields.view[this.propertyType(rawConfigFilterProperties)],
                {fieldName: propertyKey, fieldValue: loadedEntity[propertyKey]}
            );
        }
        let renderedView = await this.themeManager.templateEngine.render(
            this.adminContents.entities[entityPath].view,
            renderedViewProperties
        );
        return await this.renderRoute(renderedView, this.adminContents.sideBar);
    }

    propertyType(rawConfigFilterProperties)
    {
        let propertyType = rawConfigFilterProperties.type || 'text';
        if('reference' === propertyType){
            propertyType = 'text';
        }
        return propertyType;
    }

    async generateListRouteContent(req, driverResource, entityPath)
    {
        let page = Number(req?.body?.page || 0);
        let pageSize = Number(req?.body?.pageSize || 25);
        let filtersFromParams = req?.body?.filters || {};
        let filters = this.prepareFilters(filtersFromParams, driverResource);
        let mappedFiltersValues = driverResource.options.filterProperties.map((property) => {
            let filterValue = (filtersFromParams[property] || '').toString();
            return {[property]: '' === filterValue ? '' : 'value="'+filterValue+'"'};
        });
        let entitiesRows = await this.loadEntitiesForList(driverResource, pageSize, page, req, filters);
        let listRawContent = this.adminContents.entities[entityPath].list.toString();
        let listVars = {
            fieldsHeaders: driverResource.options.listProperties.map((property) => {
                // @TODO - BETA - Replace by translations.
                let title = property.replace(/_/g, ' ');
                return title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();
            }),
            rows: entitiesRows
        };
        let list = await this.themeManager.templateEngine.render(this.adminFilesContents.listContent, listVars);
        let entitiesListView = await this.themeManager.templateEngine.render(
            listRawContent,
            Object.assign({list}, ...mappedFiltersValues)
        );
        return await this.renderRoute(
            entitiesListView,
            this.adminContents.sideBar
        );
    }

    async loadEntitiesForList(driverResource, pageSize, page, req, filters)
    {
        let entityRepository = this.dataServer.getEntity(driverResource.entityKey);
        entityRepository.limit = pageSize;
        entityRepository.offset = page;
        entityRepository.sortBy = req?.body?.sortBy || false;
        entityRepository.sortDirection = req?.body?.sortDirection || false;
        let loadedEntities = await entityRepository.loadWithRelations(filters, []);
        entityRepository.limit = 0;
        entityRepository.offset = 0;
        entityRepository.sortBy = false;
        entityRepository.sortDirection = false;
        return loadedEntities.map((entity) => {
            let entityRow = {fields: []};
            let resourceProperties = driverResource.options?.properties;
            let idProperty = this.fetchEntityIdPropertyKey(resourceProperties);
            let viewLink = '';
            if('' !== idProperty){
                viewLink = this.generateEntityRoute('viewPath', driverResource, idProperty, entity);
            }
            for(let property of driverResource.options.listProperties){
                entityRow.fields.push({value: entity[property], viewLink});
            }
            return entityRow;
        });
    }

    fetchEntityIdPropertyKey(resourceProperties)
    {
        let idProperty = '';
        if('' === idProperty && resourceProperties){
            let idProperties = Object.keys(resourceProperties).filter((propertyKey) => {
                return resourceProperties[propertyKey].isId;
            });
            if(0 < idProperties.length){
                idProperty = idProperties.shift();
            }
        }
        return idProperty;
    }

    generateEntityRoute(routeType, driverResource, idProperty, entity)
    {
        return this.rootPath+'/'+driverResource.entityPath+this[routeType]+'?'+idProperty+'='+entity[idProperty];
    }

    isAuthenticated(req, res, next)
    {
        if(req.session?.user){
            return next();
        }
        res.redirect(this.rootPath+this.loginPath);
    }

    prepareFilters(filtersList, driverResource)
    {
        let filtersKeys = Object.keys(filtersList);
        if(0 === filtersKeys.length){
            return {};
        }
        let filters = {};
        for(let i of filtersKeys){
            let filter = filtersList[i];
            if ('' === filter){
                continue;
            }
            let rawConfigFilterProperties = driverResource.options.properties[i];
            // @TODO - BETA - Replace isVirtual by isUpload.
            if(rawConfigFilterProperties.isVirtual){
                continue;
            }
            if('reference' === rawConfigFilterProperties.type){
                filters[i] = filter;
                continue;
            }
            if('boolean' === rawConfigFilterProperties.type){
                filters[i] = ('true' === filter);
                continue;
            }
            filters[i] = {operator: 'like', value: '%'+filter+'%'};
        }
        return filters;
    }

}

module.exports.AdminManager = AdminManager;
