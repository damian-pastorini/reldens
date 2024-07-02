/**
 *
 * Reldens - AdminManager
 *
 */

const { AdminTranslations } = require('./admin-translations');
const { AdminEntitiesGenerator } = require('./admin-entities-generator');
const { AdminManagerConfig } = require('./admin-manager-config');
const { FileHandler } = require('../../game/server/file-handler');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

class AdminManager
{

    dataServerConfig = null;
    dataServer = null;
    events = null;
    loginManager = null;
    app = null;
    applicationFramework = null;
    fileStorageManager = null;
    bodyParser = null;
    session = null;
    gameServer = null;
    config = null;
    themeManager = null;
    secret = '';
    useSecureLogin = false;
    rootPath = '';
    adminRoleId = null;
    buildAdminScriptsOnActivation = null;
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
        this.deletePath = '/delete';
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
        this.buildAdminScriptsOnActivation = this.config.getWithoutLogs(
            'server/admin/buildAdminScriptsOnActivation',
            true
        );
        this.translations = AdminTranslations.appendTranslations(this.dataServerConfig?.translations || {});
        this.stylesFilePath = this.config.getWithoutLogs(
            'server/admin/stylesPath',
            '/css/'+GameConst.STRUCTURE.ADMIN_CSS_FILE
        );
        this.scriptsFilePath = this.config.getWithoutLogs(
            'server/admin/scriptsPath',
            '/'+GameConst.STRUCTURE.ADMIN_JS_FILE
        );
        this.branding = {
            companyName: this.config.getWithoutLogs('server/admin/companyName', 'Reldens - Administration Panel'),
            logo: this.config.getWithoutLogs('server/admin/logoPath', '/assets/web/reldens-your-logo-mage.png'),
            favicon: this.config.getWithoutLogs('server/admin/faviconPath', '/assets/web/favicon.ico'),
            copyRight: this.config.getWithoutLogs(
                'server/admin/copyRight',
                await FileHandler.fetchFileContents(
                    FileHandler.joinPaths(
                        this.themeManager.projectAdminTemplatesPath,
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
        await this.buildAdminScripts();
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
        return await this.render(
            this.adminFilesContents.layout,
            {
                sideBar: '{{&sideBar}}',
                pageContent: '{{&pageContent}}',
                stylesFilePath: this.stylesFilePath,
                scriptsFilePath: this.scriptsFilePath,
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
                navigationContents[navigation.name][driverResource.id()] = await this.render(
                    this.adminFilesContents.sideBarItem,
                    {name, path}
                );
                continue;
            }
            navigationContents[driverResource.id()] = await this.render(
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
                navigationView += await this.render(
                    this.adminFilesContents.sideBarHeader,
                    {name: id, subItems}
                );
                continue;
            }
            navigationView += navigationContents[id];
        }
        return await this.render(
            this.adminFilesContents.sideBar,
            {
                rootPath: this.rootPath,
                navigationView
            }
        );
    }

    async buildLogin()
    {
        return await this.render(
            this.adminContents.layout,
            {
                sideBar: '',
                pageContent: this.adminFilesContents.login,
                stylesFilePath: this.stylesFilePath,
                scriptsFilePath: this.scriptsFilePath,
                brandingCompanyName: this.branding.companyName,
                copyRight: this.branding.copyRight
            }
        );
    }

    async buildDashboard()
    {
        return await this.render(
            this.adminContents.layout,
            {
                sideBar: this.adminContents.sideBar,
                pageContent: this.adminFilesContents.dashboard,
                stylesFilePath: this.stylesFilePath,
                scriptsFilePath: this.scriptsFilePath,
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
            let entitySaveRoute = entityListRoute+this.savePath;
            let entityEditRoute = entityListRoute+this.editPath;
            // @TODO - BETA - Refactor every driverResource to include proper data, current ones are legacy.
            let uploadProperties = this.fetchUploadProperties(driverResource);
            entitiesContents[entityName] = {
                list: await this.render(
                    this.adminFilesContents.list,
                    {
                        entityName,
                        title,
                        entityListRoute,
                        entityEditRoute,
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
                view: await this.render(
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
                edit: await this.render(
                    this.adminFilesContents.edit,
                    {
                        entityName,
                        entitySaveRoute,
                        id: '{{&id}}',
                        idProperty: '{{&idProperty}}',
                        title: '{{&title}}',
                        entityViewRoute: '{{&entityViewRoute}}',
                        multipartFormData: 0 < uploadProperties.length ? ' enctype="multipart/form-data"' : '',
                        editFields: driverResource.options.editProperties.map((property) => {
                            return {
                                name: property,
                                value: '{{&'+property+'}}'
                            };
                        })
                    }
                )
            };
        }
        return entitiesContents;
    }

    fetchUploadProperties(driverResource)
    {
        if(!driverResource.options.uploadProperties){
            driverResource.options.uploadProperties = [];
            for(let propertyKey of Object.keys(driverResource.options.properties)){
                let property = driverResource.options.properties[propertyKey];
                if(property.isUpload){
                    driverResource.options.uploadProperties.push(property);
                }
            }
        }
        return driverResource.options.uploadProperties;
    }

    render(content, params)
    {
        return this.themeManager.templateEngine.render(content, params);
    }

    async renderRoute(pageContent, sideBar)
    {
        return await this.render(
            this.adminContents.layout,
            {
                stylesFilePath: this.stylesFilePath,
                scriptsFilePath: this.scriptsFilePath,
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

    async buildAdminScripts()
    {
        if(!this.buildAdminScriptsOnActivation){
            return;
        }
        await this.themeManager.buildAdminScripts();
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
            let { email, password } = req.body;
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
                let routeContents = await this.generateEditRouteContent(req, driverResource, entityPath);
                return res.send(routeContents);
            });
            this.adminRouter.post(entityRoute+this.savePath, this.isAuthenticated.bind(this), async (req, res) => {
                let redirectResult = await this.processSaveEntity(req, res, driverResource, entityPath);
                return res.redirect(redirectResult);
            });
            this.adminRouter.post(entityRoute+this.deletePath, this.isAuthenticated.bind(this), async (req, res) => {
                let redirectResult = await this.processDeleteEntities(req, res, driverResource, entityPath);
                return res.redirect(redirectResult);
            });
        }
    }

    async processDeleteEntities(req, res, driverResource, entityPath)
    {
        let ids = req?.body?.ids;
        let redirectPath = this.rootPath+'/'+entityPath+'?result=';
        let resultString = 'errorMissingId';
        if(!ids || 0 === ids.length){
            return redirectPath + resultString;
        }
        let entityRepository = this.dataServer.getEntity(driverResource.entityKey);
        let idProperty = this.fetchEntityIdPropertyKey(driverResource);
        let deleteResult = await entityRepository.delete({[idProperty]: {operator: 'IN', value: ids}});
        resultString = deleteResult ? 'success' : 'errorDeleteFailure';
        return redirectPath + resultString;
    }

    async processSaveEntity(req, res, driverResource, entityPath)
    {
        let id = (req?.body?.id || '').toString();
        let entityRepository = this.dataServer.getEntity(driverResource.entityKey);
        let idProperty = this.fetchEntityIdPropertyKey(driverResource);
        let resourceProperties = driverResource.options.properties;
        let entityDataPatch = this.preparePatchData(driverResource, idProperty, req, resourceProperties);
        if(!entityDataPatch){
            return this.rootPath+'/'+entityPath+'?error=saveBadPatchData';
        }
        let saveResult = await this.saveEntity(id, entityRepository, entityDataPatch);
        let routeType = saveResult ? 'viewPath' : 'editPath';
        let resultString = saveResult ? 'success' : 'error';
        return this.generateEntityRoute(routeType, driverResource, idProperty, saveResult) +'&result='+ resultString;
    }

    async saveEntity(id, entityRepository, entityDataPatch)
    {
        if('' === id){
            return entityRepository.create(entityDataPatch);
        }
        return entityRepository.updateById(id, entityDataPatch);
    }

    preparePatchData(driverResource, idProperty, req, resourceProperties)
    {
        let entityDataPatch = {};
        for(let i of driverResource.options.editProperties){
            if(i === idProperty){
                continue;
            }
            let propertyUpdateValue = sc.get(req.body, i, null);
            let property = resourceProperties[i];
            if(property.isUpload){
                // upload fields are processed outside the patch
                continue;
            }
            let isNullValue = null === propertyUpdateValue;
            let propertyType = property.type || 'string';
            if('number' === propertyType && !isNullValue){
                propertyUpdateValue = Number(propertyUpdateValue);
            }
            if('string' === propertyType && !isNullValue){
                propertyUpdateValue = String(propertyUpdateValue);
            }
            if('boolean' === propertyType){
                propertyUpdateValue = Boolean(propertyUpdateValue);
            }
            if(property.isArray && !isNullValue){
                propertyUpdateValue = propertyUpdateValue.split(property.isArray);
            }
            if(property.isRequired && null === propertyUpdateValue){
                // missing required fields would break the update
                Logger.critical('Bad patch data on update.', propertyUpdateValue, property)
                return false;
            }
            entityDataPatch[i] = propertyUpdateValue;
        }
        return entityDataPatch;
    }

    async generateEditRouteContent(req, driverResource, entityPath)
    {
        let id = (req?.query?.id || '').toString();
        let title = ('' === id ? 'Create' : 'Edit')+' '+this.translations.labels[driverResource.id()];
        let loadedEntity = '' === id ? null :await this.loadEntityById(driverResource, id);
        let idProperty = this.fetchEntityIdPropertyKey(driverResource);
        let renderedEditProperties = {
            id,
            idProperty,
            title,
            entityViewRoute: this.generateEntityRoute('viewPath', driverResource, idProperty, loadedEntity)
        };
        for(let propertyKey of await driverResource.options.editProperties){
            let rawConfigFilterProperties = driverResource.options.properties[propertyKey];
            renderedEditProperties[propertyKey] = await this.render(
                this.adminFilesContents.fields.edit[this.propertyType(rawConfigFilterProperties)],
                {
                    fieldName: propertyKey,
                    fieldValue: await this.generatePropertyEditRenderedValue(
                        loadedEntity,
                        propertyKey,
                        rawConfigFilterProperties
                    )
                }
            );
        }
        let renderedView = await this.render(this.adminContents.entities[entityPath].edit, renderedEditProperties);
        return await this.renderRoute(renderedView, this.adminContents.sideBar);
    }

    async loadEntityById(driverResource, id)
    {
        let entityRepository = this.dataServer.getEntity(driverResource.entityKey);
        return await entityRepository.loadByIdWithRelations(id);
    }

    async generateViewRouteContent(req, driverResource, entityPath)
    {
        let id = (req?.query?.id || '').toString();
        if('' === id){
            return '';
        }
        let loadedEntity = await this.loadEntityById(driverResource, id);
        let idProperty = this.fetchEntityIdPropertyKey(driverResource);
        let renderedViewProperties = {
            entityEditRoute: this.generateEntityRoute('editPath', driverResource, idProperty, loadedEntity)
        };
        for(let propertyKey of driverResource.options.showProperties){
            let rawConfigFilterProperties = driverResource.options.properties[propertyKey];
            renderedViewProperties[propertyKey] = await this.render(
                this.adminFilesContents.fields.view[this.propertyType(rawConfigFilterProperties)],
                {
                    fieldName: propertyKey,
                    fieldValue: await this.generatePropertyRenderedValue(
                        loadedEntity,
                        propertyKey,
                        rawConfigFilterProperties
                    )
                }
            );
        }
        let renderedView = await this.render(this.adminContents.entities[entityPath].view, renderedViewProperties);
        return await this.renderRoute(renderedView, this.adminContents.sideBar);
    }

    propertyType(rawConfigFilterProperty)
    {
        let propertyType = rawConfigFilterProperty.type || 'text';
        if(-1 !== ['reference', 'number', 'datetime'].indexOf(propertyType)){
            propertyType = 'text';
        }
        return propertyType;
    }

    async generateListRouteContent(req, driverResource, entityPath)
    {
        let page = Number(req?.query?.page || 1);
        let pageSize = Number(req?.query?.pageSize || 25);
        let filtersFromParams = req?.body?.filters || {};
        let filters = this.prepareFilters(filtersFromParams, driverResource);
        let mappedFiltersValues = driverResource.options.filterProperties.map((property) => {
            let filterValue = (filtersFromParams[property] || '').toString();
            return {[property]: '' === filterValue ? '' : 'value="'+filterValue+'"'};
        });
        let entitiesRows = await this.loadEntitiesForList(driverResource, pageSize, page, req, filters);
        let listRawContent = this.adminContents.entities[entityPath].list.toString();
        let totalPages = Math.ceil(await this.countTotalEntities(driverResource) / pageSize);
        let pages = this.getPageRange(page, totalPages);
        let renderedPagination = '';
        for (let page of pages){
            renderedPagination += await this.render(
                this.adminFilesContents.fields.view['link'],
                {
                    fieldName: page.label,
                    fieldValue: this.rootPath+'/'+driverResource.entityPath+'?page='+ page.value
                }
            )
        }
        let listVars = {
            fieldsHeaders: driverResource.options.listProperties.map((property) => {
                // @TODO - BETA - Replace by translations.
                let title = property.replace(/_/g, ' ');
                return {
                    name: property,
                    value: title.charAt(0).toUpperCase() + title.slice(1).toLowerCase()
                };
            }),
            rows: entitiesRows
        };
        let list = await this.render(this.adminFilesContents.listContent, listVars);
        let entitiesListView = await this.render(
            listRawContent,
            Object.assign({list, pagination: renderedPagination}, ...mappedFiltersValues)
        );
        return await this.renderRoute(
            entitiesListView,
            this.adminContents.sideBar
        );
    }

    getPageRange(page, totalPages)
    {
        let totalDisplayedPages = 5;
        let half = Math.floor(totalDisplayedPages / 2);
        let start = page - half;
        let end = page + half;
        start = Math.max(1, start);
        end = Math.min(totalPages, end);
        if(end - start + 1 < totalDisplayedPages){
            if(start === 1){
                end = Math.min(totalPages, start + totalDisplayedPages - 1);
            }
            start = Math.max(1, end - totalDisplayedPages + 1);
        }
        let range = [];
        if(1 < start){
            range.push({label: 'first', value: 1});
        }
        for(let i = start; i <= end; i++){
            range.push({label: i, value: i});
        }
        if(end < totalPages){
            range.push({label: 'last', value: totalPages - 1});
        }
        return range;
    }

    async countTotalEntities(driverResource)
    {
        let entityRepository = this.dataServer.getEntity(driverResource.entityKey);
        return await entityRepository.count({});
    }

    async loadEntitiesForList(driverResource, pageSize, page, req, filters)
    {
        let entityRepository = this.dataServer.getEntity(driverResource.entityKey);
        entityRepository.limit = pageSize;
        if(1 < page){
            entityRepository.offset = (page - 1) * pageSize;
        }
        entityRepository.sortBy = req?.body?.sortBy || false;
        entityRepository.sortDirection = req?.body?.sortDirection || false;
        let loadedEntities = await entityRepository.loadWithRelations(filters, []);
        entityRepository.limit = 0;
        entityRepository.offset = 0;
        entityRepository.sortBy = false;
        entityRepository.sortDirection = false;
        let entityRows = [];
        for(let entity of loadedEntities){
            let entityRow = {fields: []};
            let resourceProperties = driverResource.options?.properties;
            let idProperty = this.fetchEntityIdPropertyKey(driverResource);
            let viewLink = '';
            let editLink = '';
            if('' !== idProperty){
                viewLink = this.generateEntityRoute('viewPath', driverResource, idProperty, entity);
                editLink = this.generateEntityRoute('editPath', driverResource, idProperty, entity);
            }
            for(let property of driverResource.options.listProperties){
                entityRow.fields.push({
                    name: property,
                    value: await this.generatePropertyRenderedValue(entity, property, resourceProperties[property]),
                    viewLink
                });
            }
            entityRow.editLink = editLink;
            entityRow.deleteLink = this.rootPath + '/' + driverResource.entityPath + this.deletePath
            entityRow.id = entity[idProperty];
            entityRows.push(entityRow);
        }
        return entityRows;
    }

    async generatePropertyRenderedValue(entity, propertyKey, resourceProperty)
    {
        let renderValue = (0 === entity[propertyKey] ? '0' : entity[propertyKey] || '').toString();
        if('boolean' === resourceProperty.type){
            renderValue = '1' === renderValue || 'true' === renderValue ? 'Yes' : 'No';
        }
        if('datetime' === resourceProperty.type){
            renderValue = sc.formatDate(new Date(renderValue));
        }
        return await this.render(
            this.adminFilesContents.fields.view[this.propertyType(resourceProperty)],
            {fieldName: propertyKey, fieldValue: renderValue}
        );
    }

    async generatePropertyEditRenderedValue(entity, propertyKey, resourceProperty)
    {
        let entityPropertyValue = sc.get(entity, propertyKey, null);
        let renderValue = (0 === entityPropertyValue ? '0' : entityPropertyValue || '').toString();
        if('boolean' === resourceProperty.type){
            renderValue = '1' === renderValue || 'true' === renderValue ? ' checked="checked"' : '';
        }
        return await this.render(
            this.adminFilesContents.fields.view[this.propertyType(resourceProperty)],
            {fieldName: propertyKey, fieldValue: renderValue}
        );
    }

    fetchEntityIdPropertyKey(driverResource)
    {
        let resourceProperties = driverResource.options?.properties;
        if(!resourceProperties){
            Logger.error('ID property not found.', resourceProperties);
            return  '';
        }
        if(resourceProperties['id']){
            return 'id';
        }
        let idProperty = '';
        let idProperties = Object.keys(resourceProperties).filter((propertyKey) => {
            return resourceProperties[propertyKey].isId;
        });
        if(0 < idProperties.length){
            idProperty = idProperties.shift();
        }
        return idProperty;
    }

    generateEntityRoute(routeType, driverResource, idProperty, entity)
    {
        let idParam = '';
        if(entity){
            idParam = '?' + idProperty + '=' + entity[idProperty];
        }
        return this.rootPath + '/' + driverResource.entityPath + this[routeType] + idParam;
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
            if(rawConfigFilterProperties.isUpload){
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
