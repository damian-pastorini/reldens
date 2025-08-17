/**
 *
 * Reldens - AdminManager
 *
 */

const { UploaderFactory, FileHandler } = require('@reldens/server-utils');
const { PageRangeProvider, ValidatorInterface, Logger, sc } = require('@reldens/utils');

class AdminManager
{

    constructor(configData)
    {
        this.events = configData?.events;
        this.renderCallback = configData?.renderCallback;
        this.dataServer = configData?.dataServer;
        this.authenticationCallback = configData?.authenticationCallback;
        this.app = configData?.app;
        this.applicationFramework = configData?.appServerFactory?.applicationFramework;
        this.bodyParser = configData?.appServerFactory?.bodyParser;
        this.session = configData?.appServerFactory?.session;
        this.validator = configData?.validator;
        this.buckets = sc.get(configData, 'buckets', {});
        this.translations = sc.get(configData, 'translations', {});
        this.adminFilesContents = sc.get(configData, 'adminFilesContents', false);
        this.secret = sc.get(configData, 'secret', '');
        this.rootPath = sc.get(configData, 'rootPath', '');
        this.adminRoleId = sc.get(configData, 'adminRoleId', 0);
        this.buildAdminCssOnActivation = sc.get(configData, 'buildAdminCssOnActivation', false);
        this.buildAdminScriptsOnActivation = sc.get(configData, 'buildAdminScriptsOnActivation', false);
        this.updateAdminAssetsDistOnActivation = sc.get(configData, 'updateAdminAssetsDistOnActivation', false);
        this.stylesFilePath = sc.get(configData, 'stylesFilePath', '');
        this.scriptsFilePath = sc.get(configData, 'scriptsFilePath', '');
        this.autoSyncDistCallback = sc.get(configData, 'autoSyncDistCallback', false);
        this.branding = sc.get(configData, 'branding', {});
        this.entities = sc.get(configData, 'entities', {});
        this.logoutPath = '/logout';
        this.loginPath = '/login';
        this.viewPath = '/view';
        this.editPath = '/edit';
        this.savePath = '/save';
        this.deletePath = '/delete';
        this.mimeTypes = sc.get(configData, 'mimeTypes', false);
        this.allowedExtensions = sc.get(configData, 'allowedExtensions', false);
        this.uploaderFactory = sc.get(configData, 'uploaderFactory', new UploaderFactory({
            mimeTypes: this.mimeTypes,
            allowedExtensions: this.allowedExtensions,
            applySecureFileNames: sc.get(configData, 'applySecureFileNames', false)
        }));
        this.adminContents = {};
        this.blackList = {};
    }

    async setupAdmin()
    {
        if(this.validator instanceof ValidatorInterface && !this.validator.validate(this)){
            return false;
        }
        this.resourcesByReference = {};
        this.resources = this.prepareResources(this.entities);
        this.relations = this.prepareRelations(this.entities);
        await this.buildAdminContents();
        await this.buildAdminScripts();
        await this.buildAdminCss();
        await this.updateAdminAssets();
        this.setupAdminRouter();
        await this.events.emit('reldens.setupAdminRouter', {adminManager: this});
        this.setupAdminRoutes();
        await this.events.emit('reldens.setupAdminRoutes', {adminManager: this});
        await this.setupEntitiesRoutes();
        await this.events.emit('reldens.setupAdminManagers', {adminManager: this});
    }

    async buildAdminContents()
    {
        this.adminContents.layout = await this.buildLayout();
        this.adminContents.sideBar = await this.buildSideBar();
        this.adminContents.login = await this.buildLogin();
        this.adminContents.dashboard = await this.buildDashboard();
        this.adminContents.entities = await this.buildEntitiesContents();
        this.events.emit('reldens.buildAdminContentsAfter', {adminManager: this});
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
        let eventBuildSideBarBefore = {navigationContents, adminManager: this};
        await this.events.emit('reldens.eventBuildSideBarBefore', eventBuildSideBarBefore);
        navigationContents = eventBuildSideBarBefore.navigationContents;
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
        let eventAdminSideBarBeforeSubItems = {navigationContents, adminManager: this};
        await this.events.emit('reldens.adminSideBarBeforeSubItems', eventAdminSideBarBeforeSubItems);
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
        let eventAdminSideBarBeforeRender = {navigationContents, navigationView, adminManager: this};
        await this.events.emit('reldens.adminSideBarBeforeRender', eventAdminSideBarBeforeRender);
        return await this.render(
            this.adminFilesContents.sideBar,
            {
                rootPath: this.rootPath,
                navigationView: eventAdminSideBarBeforeRender.navigationView
            }
        );
    }

    async buildLogin()
    {
        return await this.renderRoute(this.adminFilesContents.login, '');
    }

    async buildDashboard()
    {
        return await this.renderRoute(this.adminFilesContents.dashboard, this.adminContents.sideBar);
    }

    async buildEntitiesContents()
    {
        let entitiesContents = {};
        for(let driverResource of this.resources){
            let templateTitle = this.translations.labels[driverResource.id()];
            let entityName = (driverResource.id().replace(/_/g, '-'));
            let entityListRoute = this.rootPath+'/'+entityName;
            let entityEditRoute = entityListRoute+this.editPath;
            let entitySaveRoute = entityListRoute+this.savePath;
            let entityDeleteRoute = entityListRoute+this.deletePath;
            let uploadProperties = this.fetchUploadProperties(driverResource);
            let multipartFormData = 0 < Object.keys(uploadProperties).length ? ' enctype="multipart/form-data"' : '';
            let idProperty = this.fetchEntityIdPropertyKey(driverResource);
            let editProperties = Object.keys(driverResource.options.properties);
            editProperties.splice(editProperties.indexOf(idProperty), 1);
            let filters = driverResource.options.filterProperties.map((property) => {
                return {
                    propertyKey: property,
                    name: this.fetchTranslation(property),
                    value: '{{&'+property+'}}'
                };
            });
            let fields = driverResource.options.showProperties.map((property) => {
                return {
                    name: this.fetchTranslation(property),
                    value: '{{&'+property+'}}'
                };
            });
            let editFields = editProperties.map((property) => {
                return {
                    name: this.fetchTranslation(property),
                    value: '{{&'+property+'}}'
                };
            });
            let extraContentForList = sc.get(this.adminFilesContents?.sections?.list, driverResource.entityPath, '');
            let extraContentForView = await this.render(
                sc.get(this.adminFilesContents?.sections?.view, driverResource.entityPath, ''),
                {
                    id: '{{&id}}',
                    entitySerializedData: '{{&entitySerializedData}}'
                }
            );
            let extraContentForEdit = sc.get(this.adminFilesContents?.sections?.edit, driverResource.entityPath, '');
            entitiesContents[entityName] = {
                list: await this.render(
                    this.adminFilesContents.list,
                    {
                        entityName,
                        templateTitle,
                        entityListRoute,
                        entityEditRoute,
                        filters,
                        list: '{{&list}}',
                        pagination: '{{&pagination}}',
                        extraContent: extraContentForList,
                    }
                ),
                view: await this.render(
                    this.adminFilesContents.view,
                    {
                        entityName,
                        templateTitle,
                        entityDeleteRoute,
                        entityListRoute,
                        fields,
                        id: '{{&id}}',
                        entityEditRoute: '{{&entityEditRoute}}',
                        entityNewRoute: '{{&entityNewRoute}}',
                        extraContent: extraContentForView,
                    }
                ),
                edit: await this.render(
                    this.adminFilesContents.edit,
                    {
                        entityName,
                        entitySaveRoute,
                        multipartFormData,
                        editFields,
                        idValue: '{{&idValue}}',
                        idProperty: '{{&idProperty}}',
                        templateTitle: '{{&templateTitle}}',
                        entityViewRoute: '{{&entityViewRoute}}',
                        extraContent: extraContentForEdit,
                    }
                )
            };
        }
        return entitiesContents;
    }

    fetchUploadProperties(driverResource)
    {
        if(!driverResource.options.uploadProperties){
            driverResource.options.uploadProperties = {};
            for(let propertyKey of Object.keys(driverResource.options.properties)){
                let property = driverResource.options.properties[propertyKey];
                if(property.isUpload){
                    driverResource.options.uploadProperties[propertyKey] = property;
                }
            }
        }
        return driverResource.options.uploadProperties;
    }

    async render(content, params)
    {
        return await this.renderCallback(content, params);
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

    async buildAdminScripts()
    {
        if(!sc.isFunction(this.buildAdminScriptsOnActivation)){
            return false;
        }
        return this.buildAdminScriptsOnActivation();
    }

    async updateAdminAssets()
    {
        if(!sc.isFunction(this.updateAdminAssetsDistOnActivation)){
            return false;
        }
        return this.updateAdminAssetsDistOnActivation();
    }

    async buildAdminCss()
    {
        if(!sc.isFunction(this.buildAdminCssOnActivation)){
            return false;
        }
        return this.buildAdminCssOnActivation();
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
            // @TODO - BETA - Refactor to add the ID property and composed labels (id + label), in the resource.
            let driverResource = {
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
                    properties: rawResource.config.properties || {},
                    titleProperty: sc.get(rawResource.config, 'titleProperty', null),
                    sort: sc.get(rawResource.config, 'sort', null),
                    navigationPosition: sc.get(rawResource.config, 'navigationPosition', 2000)
                },
            };
            this.resourcesByReference[tableName] = driverResource;
            registeredResources.push(driverResource);
        }
        registeredResources.sort((a, b) => a.options.navigationPosition - b.options.navigationPosition);
        return registeredResources;
    }

    prepareRelations()
    {
        // @TODO - BETA - Refactor, include in resources generation at once.
        let registeredRelations = {};
        for(let resource of this.resources){
            for(let propertyKey of Object.keys(resource.options.properties)){
                let property = resource.options.properties[propertyKey];
                if('reference' !== property.type){
                    continue;
                }
                let relationResource = this.resources.filter((resource) => {
                    return resource.id() === property.reference;
                }).shift();
                let relationKey = property.alias || property.reference;
                let titleProperty = relationResource?.options?.titleProperty;
                if(!titleProperty){
                    continue;
                }
                if(!registeredRelations[property.reference]){
                    registeredRelations[property.reference] = {};
                }
                registeredRelations[property.reference][relationKey] = titleProperty;
            }
        }
        return registeredRelations;
    }

    setupAdminRouter()
    {
        this.adminRouter = this.applicationFramework.Router();
        // apply session middleware only to /admin routes:
        if(this.session){
            this.adminRouter.use(this.session({secret: this.secret, resave: false, saveUninitialized: true}));
        }
        this.adminRouter.use(this.bodyParser.json());
    }

    setupAdminRoutes()
    {
        this.adminRouter.get(this.loginPath, async (req, res) => {
            return res.send(this.adminContents.login);
        });
        // route for handling login:
        this.adminRouter.post(this.loginPath, async (req, res) => {
            let { email, password } = req.body;
            let loginResult = await this.authenticationCallback(email, password, this.adminRoleId);
            if(loginResult){
                req.session.user = loginResult;
                return res.redirect(this.rootPath);
            }
            return res.redirect(this.rootPath+this.loginPath+'?login-error=true');
        });
        // route for the admin panel dashboard:
        this.adminRouter.get('/', this.isAuthenticated.bind(this), async (req, res) => {
            return res.send(this.adminContents.dashboard);
        });
        // route for logout:
        this.adminRouter.get(this.logoutPath, (req, res) => {
            req.session.destroy();
            res.redirect(this.rootPath+this.loginPath);
        });
        this.app.use(this.rootPath, this.adminRouter);
    }

    async setupEntitiesRoutes()
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
                if('' === routeContents){
                    return res.redirect(this.rootPath+'/'+entityPath+'?result=errorView');
                }
                return res.send(routeContents);
            });
            this.adminRouter.get(entityRoute+this.editPath, this.isAuthenticated.bind(this), async (req, res) => {
                let routeContents = await this.generateEditRouteContent(req, driverResource, entityPath);
                if('' === routeContents){
                    return res.redirect(this.rootPath+'/'+entityPath+'?result=errorEdit');
                }
                return res.send(routeContents);
            });
            this.setupSavePath(entityRoute, driverResource, entityPath);
            this.adminRouter.post(entityRoute+this.deletePath, this.isAuthenticated.bind(this), async (req, res) => {
                let redirectResult = await this.processDeleteEntities(req, res, driverResource, entityPath);
                return res.redirect(redirectResult);
            });
            await this.events.emit('reldens.setupEntitiesRoutes', {
                adminManager: this,
                entityPath,
                entityRoute,
                driverResource
            });
        }
    }

    setupSavePath(entityRoute, driverResource, entityPath)
    {
        let uploadProperties = this.fetchUploadProperties(driverResource);
        let uploadPropertiesKeys = Object.keys(uploadProperties || {});
        if(0 === uploadPropertiesKeys.length){
            this.adminRouter.post(
                entityRoute+this.savePath,
                this.isAuthenticated.bind(this),
                async (req, res) => {
                    let redirectResult = await this.processSaveEntity(req, res, driverResource, entityPath);
                    return res.redirect(redirectResult);
                }
            );
            return;
        }
        let fields = [];
        let allowedFileTypes = {};
        for(let uploadPropertyKey of uploadPropertiesKeys){
            let property = uploadProperties[uploadPropertyKey];
            allowedFileTypes[uploadPropertyKey] = property.allowedTypes || false;
            let field = {name: uploadPropertyKey};
            if(!property.isArray){
                field.maxCount = 1;
            }
            fields.push(field);
            this.buckets[uploadPropertyKey] = property.bucket;
        }
        this.adminRouter.post(
            entityRoute + this.savePath,
            this.isAuthenticated.bind(this),
            this.uploaderFactory.createUploader(fields, this.buckets, allowedFileTypes),
            async (req, res) => {
                let redirectResult = await this.processSaveEntity(req, res, driverResource, entityPath);
                return res.redirect(redirectResult);
            }
        );
    }

    async processDeleteEntities(req, res, driverResource, entityPath)
    {
        let ids = req?.body?.ids;
        if('string' === typeof ids){
            ids = ids.split(',');
        }
        let redirectPath = this.rootPath+'/'+entityPath+'?result=';
        let resultString = 'errorMissingId';
        if(!ids || 0 === ids.length){
            return redirectPath + resultString;
        }
        try {
            let entityRepository = this.dataServer.getEntity(driverResource.entityKey);
            let idProperty = this.fetchEntityIdPropertyKey(driverResource);
            let idsFilter = {[idProperty]: {operator: 'IN', value: ids}};
            let loadedEntities = await entityRepository.load(idsFilter);
            await this.deleteEntitiesRelatedFiles(driverResource, loadedEntities);
            let deleteResult = await entityRepository.delete(idsFilter);
            resultString = deleteResult ? 'success' : 'errorStorageFailure';
        } catch (error) {
            resultString = 'errorDeleteFailure';
        }
        return redirectPath + resultString;
    }

    async deleteEntitiesRelatedFiles(driverResource, entities)
    {
        let resourcePropertiesKeys = Object.keys(driverResource.options.properties);
        for(let propertyKey of resourcePropertiesKeys){
            let property = driverResource.options.properties[propertyKey];
            if(!property.isUpload){
                continue;
            }
            for(let entity of entities){
                if(!property.isArray){
                    FileHandler.remove([(property.bucket || ''), entity[propertyKey]]);
                    continue;
                }
                let entityFiles = entity[propertyKey].split(property.isArray);
                for(let entityFile of entityFiles){
                    FileHandler.remove([(property.bucket || ''), entityFile]);
                }
            }
        }
    }

    async processSaveEntity(req, res, driverResource, entityPath)
    {
        let idProperty = this.fetchEntityIdPropertyKey(driverResource);
        let id = (req?.body[idProperty] || '').toString();
        let entityRepository = this.dataServer.getEntity(driverResource.entityKey);
        let resourceProperties = driverResource.options.properties;
        let entityDataPatch = this.preparePatchData(driverResource, idProperty, req, resourceProperties, id);
        if(!entityDataPatch){
            Logger.error('Bad patch data.', entityDataPatch);
            return this.rootPath+'/'+entityPath+'?result=saveBadPatchData';
        }
        let editRoute = this.generateEntityRoute('editPath', driverResource, idProperty);
        try {
            let saveResult = await this.saveEntity(id, entityRepository, entityDataPatch);
            if(!saveResult){
                Logger.error('Save result error.', saveResult, entityDataPatch);
                return editRoute+'?result=saveEntityStorageError';
            }
            if(sc.isFunction(this.autoSyncDistCallback)){
                let uploadProperties = this.fetchUploadProperties(driverResource);
                if(0 < Object.keys(uploadProperties).length){
                    for(let uploadPropertyKey of Object.keys(uploadProperties)){
                        let property = uploadProperties[uploadPropertyKey];
                        await this.autoSyncDistCallback(
                            property.bucket,
                            saveResult[uploadPropertyKey],
                            property.distFolder
                        );
                    }
                }
            }
            return this.generateEntityRoute('viewPath', driverResource, idProperty, saveResult) +'&result=success';
        } catch (error) {
            Logger.error('Save entity error.', error);
            return this.rootPath+'/'+entityPath+'?result=saveEntityError';
        }
    }

    async saveEntity(id, entityRepository, entityDataPatch)
    {
        if('' === id){
            return entityRepository.create(entityDataPatch);
        }
        return entityRepository.updateById(id, entityDataPatch);
    }

    preparePatchData(driverResource, idProperty, req, resourceProperties, id)
    {
        let entityDataPatch = {};
        for(let i of driverResource.options.editProperties){
            if(i === idProperty){
                continue;
            }
            let propertyUpdateValue = sc.get(req.body, i, null);
            let property = resourceProperties[i];
            let isNullValue = null === propertyUpdateValue;
            let propertyType = property.type || 'string';
            if(property.isUpload){
                propertyType = 'upload';
                propertyUpdateValue = this.prepareUploadPatchData(req, i, propertyUpdateValue, property);
            }
            if('number' === propertyType && !isNullValue){
                propertyUpdateValue = Number(propertyUpdateValue);
            }
            if('string' === propertyType && !isNullValue){
                propertyUpdateValue = String(propertyUpdateValue);
            }
            if('boolean' === propertyType){
                propertyUpdateValue = Boolean(propertyUpdateValue);
            }
            let isUploadCreate = property.isUpload && !id;
            if(property.isRequired && null === propertyUpdateValue && (!property.isUpload || isUploadCreate)){
                // missing required fields would break the update:
                Logger.critical('Bad patch data on update.', propertyUpdateValue, property);
                return false;
            }
            if(!property.isUpload || (property.isUpload && null !== propertyUpdateValue)){
                entityDataPatch[i] = propertyUpdateValue;
            }
        }
        return entityDataPatch;
    }

    prepareUploadPatchData(req, i, propertyUpdateValue, property)
    {
        let filesData = sc.get(req.files, i, null);
        if(null === filesData){
            return null;
        }
        let fileNames = [];
        for(let file of filesData){
            fileNames.push(file.filename);
        }
        return fileNames.join(property.isArray);
    }

    async generateEditRouteContent(req, driverResource, entityPath)
    {
        let idProperty = this.fetchEntityIdPropertyKey(driverResource);
        let idValue = (req?.query[idProperty] || '').toString();
        let templateTitle = ('' === idValue ? 'Create' : 'Edit')+' '+this.translations.labels[driverResource.id()];
        let loadedEntity = '' === idValue ? null :await this.loadEntityById(driverResource, idValue);
        let entityViewRoute = '' === idValue
            ? this.rootPath+'/'+driverResource.entityPath
            : this.generateEntityRoute('viewPath', driverResource, idProperty, loadedEntity);
        let renderedEditProperties = {
            idValue,
            idProperty,
            idPropertyLabel: this.fetchTranslation(idProperty),
            templateTitle,
            entityViewRoute
        };
        let propertiesKeys = Object.keys(driverResource.options.properties);
        for(let propertyKey of propertiesKeys){
            let resourceProperty = driverResource.options.properties[propertyKey];
            let fieldDisabled = -1 === driverResource.options.editProperties.indexOf(propertyKey);
            let isRequired = resourceProperty.isRequired ? ' required="required"' : '';
            if(resourceProperty.isUpload && loadedEntity){
                isRequired = '';
            }
            renderedEditProperties[propertyKey] = await this.render(
                this.adminFilesContents.fields.edit[this.propertyType(resourceProperty, 'edit')],
                {
                    fieldName: propertyKey,
                    fieldValue: await this.generatePropertyEditRenderedValue(
                        loadedEntity,
                        propertyKey,
                        resourceProperty
                    ),
                    fieldDisabled: fieldDisabled ? ' disabled="disabled"' : '',
                    required: isRequired,
                    multiple: resourceProperty.isArray ? ' multiple="multiple"' : ''
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
        let idProperty = this.fetchEntityIdPropertyKey(driverResource);
        let id = (sc.get(req.query, idProperty, '')).toString();
        if('' === id){
            Logger.error('Missing ID on view route.', entityPath, id, idProperty);
            return '';
        }
        let loadedEntity = await this.loadEntityById(driverResource, id);
        let renderedViewProperties = {
            entityEditRoute: this.generateEntityRoute('editPath', driverResource, idProperty, loadedEntity),
            entityNewRoute: this.generateEntityRoute('editPath', driverResource, idProperty),
            id
        };
        let entitySerializedData = {};
        for(let propertyKey of driverResource.options.showProperties){
            let resourceProperty = driverResource.options.properties[propertyKey];
            let {fieldValue, fieldName} = this.generatePropertyRenderedValueWithLabel(
                loadedEntity,
                propertyKey,
                resourceProperty
            );
            entitySerializedData[fieldName] = fieldValue;
            let renderedFieldValue = await this.generatePropertyRenderedValue(
                fieldValue,
                fieldName,
                resourceProperty,
                'view'
            );
            renderedViewProperties[propertyKey] = await this.render(
                this.adminFilesContents.fields.view[this.propertyType(resourceProperty)],
                {
                    fieldName: propertyKey,
                    fieldValue: renderedFieldValue,
                    fieldOriginalValue: fieldValue,
                    target: ' target="_blank"'
                }
            );
        }
        let extraDataEvent = {entitySerializedData, entityId: driverResource.id(), entity: loadedEntity};
        await this.events.emit('adminEntityExtraData', extraDataEvent);
        entitySerializedData = extraDataEvent.entitySerializedData;
        renderedViewProperties.entitySerializedData = JSON.stringify(entitySerializedData).replace(/"/g, '&quot;');
        let renderedView = await this.render(this.adminContents.entities[entityPath].view, renderedViewProperties);
        return await this.renderRoute(renderedView, this.adminContents.sideBar);
    }

    propertyType(resourceProperty, templateType)
    {
        let propertyType = resourceProperty.type || 'text';
        if('reference' === propertyType && 'edit' === templateType){
            return 'select';
        }
        if(resourceProperty.isUpload){
            if('edit' === templateType){
                return 'file';
            }
            if('view' === templateType){
                let multiple = resourceProperty.isArray ? 's' : '';
                let allowedTypes = sc.get(resourceProperty, 'allowedTypes', '');
                if('' !== allowedTypes){
                    let templateName = allowedTypes+multiple;
                    if(sc.hasOwn(this.adminFilesContents.fields.view, templateName)){
                        return templateName;
                    }
                }
                if('text' === resourceProperty.allowedTypes){
                    return 'link'+multiple
                }
                return 'text';
            }
        }
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
        let totalPages = Math.ceil(await this.countTotalEntities(driverResource, filters) / pageSize);
        let pages = PageRangeProvider.fetch(page, totalPages);
        let renderedPagination = '';
        for(let page of pages){
            renderedPagination += await this.render(
                this.adminFilesContents.fields.view['link'],
                {
                    fieldName: page.label,
                    fieldValue: this.rootPath+'/'+driverResource.entityPath+'?page='+ page.value,
                    fieldOriginalValue: page.value,
                }
            );
        }
        let listVars = {
            deletePath: this.rootPath + '/' + driverResource.entityPath + this.deletePath,
            fieldsHeaders: driverResource.options.listProperties.map((property) => {
                let propertyTitle = this.fetchTranslation(property, driverResource.id());
                let alias = this.fetchTranslation(
                    driverResource.options.properties[property]?.alias || '',
                    driverResource.id()
                );
                let title = '' !== alias ? alias + ' ('+propertyTitle+')' : propertyTitle;
                return {name: property, value: title};
            }),
            rows: entitiesRows
        };
        let list = await this.render(this.adminFilesContents.listContent, listVars);
        let entitiesListView = await this.render(
            listRawContent,
            Object.assign({list, pagination: renderedPagination}, ...mappedFiltersValues)
        );
        return await this.renderRoute(entitiesListView, this.adminContents.sideBar);
    }

    fetchTranslation(snippet, group)
    {
        if('' === snippet){
            return snippet;
        }
        let translationGroup = sc.get(this.translations, group);
        if(translationGroup){
            let translationByGroup = sc.get(translationGroup, snippet, '');
            if('' !== translationByGroup){
                return translationByGroup;
            }
        }
        return sc.get(this.translations, snippet, snippet);
    }

    async countTotalEntities(driverResource, filters)
    {
        /** @type {BaseDriver|ObjectionJsDriver} entityRepository **/
        let entityRepository = this.dataServer.getEntity(driverResource.entityKey);
        return await entityRepository.count(filters);
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
        let deleteLink = this.rootPath + '/' + driverResource.entityPath + this.deletePath;
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
                let {fieldValue, fieldName} = this.generatePropertyRenderedValueWithLabel(
                    entity,
                    property,
                    resourceProperties[property]
                );
                let value = await this.generatePropertyRenderedValue(
                    fieldValue,
                    fieldName,
                    resourceProperties[property]
                );
                entityRow.fields.push({
                    name: property,
                    value,
                    viewLink
                });
            }
            entityRow.editLink = editLink;
            entityRow.deleteLink = deleteLink;
            entityRow.id = entity[idProperty];
            entityRows.push(entityRow);
        }
        return entityRows;
    }

    async generatePropertyRenderedValue(fieldValue, fieldName, resourceProperty, templateType)
    {
        let fieldOriginalValue = fieldValue;
        if('view' === templateType){
            if(resourceProperty.isArray){
                fieldValue = fieldValue.split(resourceProperty.isArray).map((value) => {
                    let target = resourceProperty.isUpload ? ' target="_blank"' : '';
                    let fieldValuePart = resourceProperty.isUpload && resourceProperty.bucketPath
                        ? resourceProperty.bucketPath+value
                        : value;
                    return {fieldValuePart, fieldOriginalValuePart: value, target};
                });
            }
            if(!resourceProperty.isArray && resourceProperty.isUpload){
                fieldValue = resourceProperty.bucketPath+fieldValue;
            }
        }
        return await this.render(
            this.adminFilesContents.fields.view[this.propertyType(resourceProperty, templateType)],
            {fieldName, fieldValue, fieldOriginalValue, target: ' target="_blank"'}
        );
    }

    generatePropertyRenderedValueWithLabel(entity, propertyKey, resourceProperty)
    {
        let fieldValue = (0 === entity[propertyKey] ? '0' : entity[propertyKey] || '').toString();
        let fieldName = propertyKey;
        if('boolean' === resourceProperty.type){
            fieldValue = '1' === fieldValue || 'true' === fieldValue ? 'Yes' : 'No';
        }
        if('datetime' === resourceProperty.type){
            fieldValue = '' !== fieldValue ? sc.formatDate(new Date(fieldValue)) : '';
        }
        if('reference' === resourceProperty.type){
            let relationKey = resourceProperty.alias || resourceProperty.reference;
            let relationEntity = entity[relationKey];
            if(relationEntity){
                let relation = this.relations[resourceProperty.reference];
                if(relation){
                    let relationTitleProperty = relation[relationKey];
                    if(relationTitleProperty && '' !== String(relationEntity[relationTitleProperty] || '')){
                        fieldName = relationTitleProperty;
                        fieldValue = relationEntity[relationTitleProperty]+(' ('+fieldValue+')');
                    }
                }
            }
        }
        if(resourceProperty.availableValues){
            let optionData = resourceProperty.availableValues.filter((availableValue) => {
                return String(availableValue.value) === String(fieldValue);
            }).shift();
            if(optionData){
                fieldValue = optionData.label + ' (' + fieldValue + ')';
            }
        }
        return {fieldValue, fieldName};
    }

    async generatePropertyEditRenderedValue(entity, propertyKey, resourceProperty)
    {
        let entityPropertyValue = sc.get(entity, propertyKey, null);
        let fieldValue = (0 === entityPropertyValue ? '0' : entityPropertyValue || '').toString();
        if('boolean' === resourceProperty.type){
            fieldValue = '1' === fieldValue || 'true' === fieldValue ? ' checked="checked"' : '';
        }
        if('reference' === resourceProperty.type){
            let relationDriverResource = this.resourcesByReference[resourceProperty.reference];
            let relation = this.relations[resourceProperty.reference];
            let relationKey = resourceProperty.alias || resourceProperty.reference;
            let idProperty = this.fetchEntityIdPropertyKey(relationDriverResource);
            let relationTitleProperty = relation ? relation[relationKey] : idProperty;
            let relationOptions = await this.fetchRelationOptions(relationDriverResource);
            return relationOptions.map((option) => {
                let value = option[idProperty];
                let selected = entity && entity[propertyKey] === value ? ' selected="selected"' : '';
                return {label: option[relationTitleProperty]+' (ID: '+value+')', value, selected}
            });
        }
        return await this.render(
            this.adminFilesContents.fields.view[this.propertyType(resourceProperty)],
            {fieldName: propertyKey, fieldValue}
        );
    }

    async fetchRelationOptions(relationDriverResource)
    {
        let relationEntityRepository = this.dataServer.getEntity(relationDriverResource.entityKey);
        return await relationEntityRepository.loadAll();
    }

    fetchEntityIdPropertyKey(driverResource)
    {
        let resourceProperties = driverResource.options?.properties;
        if(!resourceProperties){
            Logger.error('Property "ID" not found.', resourceProperties);
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
        let allowContinue = {result: true, callback: null};
        let event = {adminManager: this, req, res, next, allowContinue};
        this.events.emit('reldens.adminIsAuthenticated', event);
        let returnPath = this.rootPath+this.loginPath;
        if(false === allowContinue.result){
            return res.redirect(returnPath);
        }
        if(null !== allowContinue.callback){
            return allowContinue.callback(event);
        }
        let user = req.session?.user;
        if(!user){
            return res.redirect(returnPath);
        }
        let userBlackList = this.blackList[user.role_id] || [];
        if(-1 !== userBlackList.indexOf(req.path)){
            let referrer = String(req.headers?.referer || '');
            return res.redirect('' !== referrer ? referrer : returnPath);
        }
        return next();
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
            if('' === filter){
                continue;
            }
            let rawConfigFilterProperties = driverResource.options.properties[i];
            if(!rawConfigFilterProperties){
                Logger.critical('Could not found property by key.', i);
                continue;
            }
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
