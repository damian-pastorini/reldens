/**
 *
 * Reldens - AdminManager
 *
 */

const { UploaderFactory } = require('./uploader-factory');
const { AdminTranslations } = require('./admin-translations');
const { AdminEntitiesGenerator } = require('./admin-entities-generator');
const { AdminManagerConfig } = require('./admin-manager-config');
const { AdminDistHelper } = require('./admin-dist-helper');
const { FileHandler } = require('../../game/server/file-handler');
const { AllowedFileTypes } = require('../../game/allowed-file-types');
const { PageRangeProvider } = require('../../game/page-range-provider');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');
const {
    RandomMapGenerator,
    LayerElementsObjectLoader,
    LayerElementsCompositeLoader,
    MultipleByLoaderGenerator,
    MultipleWithAssociationsByLoaderGenerator
} = require('@reldens/tile-map-generator');

class AdminManager
{

    dataServerConfig = null;
    dataServer = null;
    events = null;
    loginManager = null;
    app = null;
    applicationFramework = null;
    fileStorageManager = null;
    mapsImporter = null;
    objectsImporter = null;
    skillsImporter = null;
    bodyParser = null;
    session = null;
    broadcastCallback = null;
    gameServer = null;
    installer = null;
    config = null;
    /** @type {?ThemeManager} **/
    themeManager = null;
    secret = '';
    useSecureLogin = false;
    rootPath = '';
    adminRoleId = 0;
    buildAdminScriptsOnActivation = null;
    buildAdminCssOnActivation = null;
    buckets = null;
    shutdownTimeout = null;
    shuttingDownIn = 0;
    adminContents = {};
    blackList = {};

    constructor(adminManagerConfig)
    {
        // @TODO - BETA - Refactor, split class in multiple services.
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
        this.managementPath = '/management';
        this.mapsWizardPath = '/maps-wizard';
        this.objectsImportPath = '/objects-import';
        this.skillsImportPath = '/skills-import';
        this.adminEntitiesGenerator = new AdminEntitiesGenerator();
        this.uploaderFactory = new UploaderFactory();
        this.mapsWizardHandlers = {
            'elements-object-loader': LayerElementsObjectLoader,
            'elements-composite-loader': LayerElementsCompositeLoader,
            'multiple-by-loader': MultipleByLoaderGenerator,
            'multiple-with-association-by-loader': MultipleWithAssociationsByLoaderGenerator
        };
    }

    async setupAdmin()
    {
        if(!this.installer.isInstalled()){
            Logger.info('Reldens is not installed, administration panel will not be available.');
            return;
        }
        this.secret = (process.env.RELDENS_ADMIN_SECRET || '').toString();
        this.useSecureLogin = Boolean(Number(process.env.RELDENS_ADMIN_SECURE_LOGIN || 0) || false);
        this.rootPath = process.env.RELDENS_ADMIN_ROUTE_PATH || '/reldens-admin';
        this.entities = this.adminEntitiesGenerator.generate(
            this.dataServerConfig.loadedEntities,
            this.dataServer.entityManager.entities
        );
        this.resourcesByReference = {};
        this.resources = this.prepareResources(this.entities);
        this.relations = this.prepareRelations(this.entities);
        this.buckets = this.fetchThemesFolders();
        this.adminRoleId = this.config.get('server/admin/roleId', 1);
        this.buildAdminCssOnActivation = this.config.getWithoutLogs('server/admin/buildAdminCssOnActivation', true);
        this.buildAdminScriptsOnActivation = this.config.getWithoutLogs(
            'server/admin/buildAdminScriptsOnActivation',
            true
        );
        this.updateAdminAssetsDistOnActivation = this.config.getWithoutLogs(
            'server/admin/updateAdminAssetsDistOnActivation',
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
        this.autoSyncDist = this.config.getWithoutLogs('server/admin/autoSyncDist', true);
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
        await this.updateAdminAssets();
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
        this.adminContents.management = await this.buildManagement();
        this.adminContents.mapsWizard = await this.buildMapsWizard();
        this.adminContents.objectsImport = await this.buildObjectsImport();
        this.adminContents.skillsImport = await this.buildSkillsImport();
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
        let navigationContents = {
            'Wizards': {
                [this.translations.labels['mapsWizard']]: await this.render(
                    this.adminFilesContents.sideBarItem,
                    {name: this.translations.labels['mapsWizard'], path: this.rootPath+this.mapsWizardPath}
                ),
                [this.translations.labels['objectsImport']]: await this.render(
                    this.adminFilesContents.sideBarItem,
                    {name: this.translations.labels['objectsImport'], path: this.rootPath+this.objectsImportPath}
                ),
                [this.translations.labels['skillsImport']]: await this.render(
                    this.adminFilesContents.sideBarItem,
                    {name: this.translations.labels['skillsImport'], path: this.rootPath+this.skillsImportPath}
                )
            }
        };
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
        navigationContents['Server'] = {'Management': await this.render(
            this.adminFilesContents.sideBarItem,
            {name: this.translations.labels['management'], path: this.rootPath+this.managementPath}
        )};
        await this.events.emitSync('adminSideBar', {navigationContents});
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
        return await this.renderRoute(this.adminFilesContents.login, '');
    }

    async buildDashboard()
    {
        return await this.renderRoute(this.adminFilesContents.dashboard, this.adminContents.sideBar);
    }

    async buildManagement()
    {
        let pageContent = await this.render(
            this.adminFilesContents.management,
            {
                actionPath: this.rootPath+this.managementPath,
                shutdownTime: this.config.getWithoutLogs('server/shutdownTime', 180),
                shuttingDownLabel: '{{&shuttingDownLabel}}',
                shuttingDownTime: '{{&shuttingDownTime}}',
                submitLabel: '{{&submitLabel}}',
                submitType: '{{&submitType}}'
            }
        );
        return await this.renderRoute(pageContent, this.adminContents.sideBar);
    }

    async buildMapsWizard()
    {
        let pageContent = await this.render(
            this.adminFilesContents.mapsWizard,
            {
                actionPath: this.rootPath+this.mapsWizardPath
            }
        );
        return await this.renderRoute(pageContent, this.adminContents.sideBar);
    }

    async buildObjectsImport()
    {
        let pageContent = await this.render(
            this.adminFilesContents.objectsImport,
            {
                actionPath: this.rootPath+this.objectsImportPath
            }
        );
        return await this.renderRoute(pageContent, this.adminContents.sideBar);
    }

    async buildSkillsImport()
    {
        let pageContent = await this.render(
            this.adminFilesContents.skillsImport,
            {
                actionPath: this.rootPath+this.skillsImportPath
            }
        );
        return await this.renderRoute(pageContent, this.adminContents.sideBar);
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
            entitiesContents[entityName] = {
                list: await this.render(
                    this.adminFilesContents.list,
                    {
                        entityName,
                        templateTitle,
                        entityListRoute,
                        entityEditRoute,
                        filters: driverResource.options.filterProperties.map((property) => {
                            return {
                                propertyKey: property,
                                name: this.fetchTranslation(property),
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
                        templateTitle,
                        fields: driverResource.options.showProperties.map((property) => {
                            return {
                                name: this.fetchTranslation(property),
                                value: '{{&'+property+'}}'
                            };
                        }),
                        entityDeleteRoute,
                        id: '{{&id}}',
                        entityListRoute,
                        entityEditRoute: '{{&entityEditRoute}}'
                    }
                ),
                edit: await this.render(
                    this.adminFilesContents.edit,
                    {
                        entityName,
                        entitySaveRoute,
                        idValue: '{{&idValue}}',
                        idProperty: '{{&idProperty}}',
                        templateTitle: '{{&templateTitle}}',
                        entityViewRoute: '{{&entityViewRoute}}',
                        multipartFormData,
                        editFields: editProperties.map((property) => {
                            return {
                                name: this.fetchTranslation(property),
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
        return await this.themeManager.templateEngine.render(content, params);
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

    async updateAdminAssets()
    {
        if(!this.updateAdminAssetsDistOnActivation){
            return;
        }
        await this.themeManager.copyAdminAssetsToDist();
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

    setupAdminRoutes()
    {
        // apply session middleware only to /admin routes:
        this.adminRouter = this.applicationFramework.Router();
        this.adminRouter.use(this.session({secret: this.secret, resave: false, saveUninitialized: true}));
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
        // management routes:
        this.adminRouter.get(this.managementPath, this.isAuthenticated.bind(this), async (req, res) => {
            let management = this.adminContents.management;
            let rendererContent = await this.render(management, this.fetchShuttingDownData());
            return res.send(rendererContent);
        });
        this.adminRouter.post(this.managementPath, this.isAuthenticated.bind(this), async (req, res) => {
            this.shutdownTime = req.body['shutdown-time'];
            let redirectManagementPath = this.rootPath+this.managementPath;
            if(!this.shutdownTime){
                return res.redirect(redirectManagementPath+'?result=shutdownError');
            }
            if(0 < this.shuttingDownIn){
                clearInterval(this.shutdownInterval);
                clearTimeout(this.shutdownTimeout);
                this.shuttingDownIn = 0;
                return res.redirect(redirectManagementPath+'?result=success');
            }
            await this.broadcastShutdownMessage();
            this.shutdownTimeout = setTimeout(
                async () => {
                    Logger.info('Server is shutting down by request on the administration panel.', sc.getTime());
                    if(this.broadcastCallback && sc.isFunction(this.broadcastCallback)){
                        await this.broadcastCallback({message: 'Server Offline.'});
                    }
                    throw new Error('Server shutdown by request on the administration panel.');
                },
                this.shutdownTime * 1000
            );
            this.shutdownInterval = setInterval(
                async () => {
                    this.shuttingDownIn--;
                    Logger.info('Server is shutting down in '+this.shuttingDownIn+' seconds.');
                    if(
                        0 < this.shuttingDownIn
                        && (this.shuttingDownIn <= 5 || Math.ceil(this.shutdownTime / 2) === this.shuttingDownIn)
                    ){
                        await this.broadcastShutdownMessage();
                    }
                    if(0 === this.shuttingDownIn){
                        Logger.info('Server OFF at: '+ sc.getTime());
                        clearInterval(this.shutdownInterval);
                    }
                },
                1000
            );
            this.shuttingDownIn = this.shutdownTime;
            return res.redirect(redirectManagementPath+'?result=success');
        });
        this.setupMapsWizardRoutes();
        this.setupObjectsImporterRoutes();
        this.setupSkillsImporterRoutes();
        // apply the adminRouter to the /admin path:
        this.app.use(this.rootPath, this.adminRouter);
    }

    setupMapsWizardRoutes()
    {
        // set generated paths to be available in the admin
        this.adminRouter.use(
            '/generate-data',
            this.isAuthenticated.bind(this),
            this.applicationFramework.static(this.themeManager.projectGenerateDataPath)
        );
        this.adminRouter.use(
            '/generated',
            this.isAuthenticated.bind(this),
            this.applicationFramework.static(this.themeManager.projectGeneratedDataPath)
        );
        Logger.info(
            'Included administration panel static routes.',
            this.themeManager.projectGenerateDataPath,
            this.themeManager.projectGeneratedDataPath
        );
        // step-1, initial wizard options:
        this.adminRouter.get(this.mapsWizardPath, this.isAuthenticated.bind(this), async (req, res) => {
            let rendererContent = await this.render(this.adminContents.mapsWizard, this.fetchShuttingDownData());
            return res.send(rendererContent);
        });
        let fields = [
            {name: 'generatorImages'},
            {name: 'generatorJsonFiles'}
        ];
        let buckets = {
            generatorImages: this.themeManager.projectGenerateDataPath,
            generatorJsonFiles: this.themeManager.projectGenerateDataPath
        };
        let allowedFileTypes = {
            generatorImages: AllowedFileTypes.IMAGE,
            generatorJsonFiles: AllowedFileTypes.TEXT
        };
        this.adminRouter.post(
            this.mapsWizardPath,
            this.isAuthenticated.bind(this),
            this.uploaderFactory.createUploader(fields, buckets, allowedFileTypes),
            async (req, res) => {
                // step-2, upload and maps generation:
                if('generate' === req?.body?.mainAction){
                    return await this.generateMaps(req, res);
                }
                // step-3, maps selection and import:
                if('import' === req?.body?.mainAction){
                    return res.redirect(await this.importSelectedMaps(req));
                }
            }
        );
    }

    setupObjectsImporterRoutes()
    {
        // step-1, import options:
        this.adminRouter.get(this.objectsImportPath, this.isAuthenticated.bind(this), async (req, res) => {
            let rendererContent = await this.render(this.adminContents.objectsImport, this.fetchShuttingDownData());
            return res.send(rendererContent);
        });
        let fields = [{name: 'generatorJsonFiles'}];
        let buckets = {generatorJsonFiles: this.themeManager.projectGeneratedDataPath};
        let allowedFileTypes = {generatorJsonFiles: AllowedFileTypes.TEXT};
        this.adminRouter.post(
            this.objectsImportPath,
            this.isAuthenticated.bind(this),
            this.uploaderFactory.createUploader(fields, buckets, allowedFileTypes),
            async (req, res) => {
                // step-2, import:
                return res.redirect(await this.importObjects(req));
            }
        );
    }

    setupSkillsImporterRoutes()
    {
        // step-1, import options:
        this.adminRouter.get(this.skillsImportPath, this.isAuthenticated.bind(this), async (req, res) => {
            let rendererContent = await this.render(this.adminContents.skillsImport, this.fetchShuttingDownData());
            return res.send(rendererContent);
        });
        let fields = [{name: 'generatorJsonFiles'}];
        let buckets = {generatorJsonFiles: this.themeManager.projectGeneratedDataPath};
        let allowedFileTypes = {generatorJsonFiles: AllowedFileTypes.TEXT};
        this.adminRouter.post(
            this.skillsImportPath,
            this.isAuthenticated.bind(this),
            this.uploaderFactory.createUploader(fields, buckets, allowedFileTypes),
            async (req, res) => {
                // step-2, import:
                return res.redirect(await this.importSkills(req));
            }
        );
    }

    async generateMaps(req, res)
    {
        let selectedHandler = req?.body?.mapsWizardAction;
        if(!selectedHandler){
            return this.mapsWizardRedirect(res, 'mapsWizardMissingActionError');
        }
        let generatorData = req?.body?.generatorData;
        if(!generatorData){
            return this.mapsWizardRedirect(res, 'mapsWizardMissingDataError');
        }
        let mapData = sc.toJson(generatorData);
        if(!mapData){
            return this.mapsWizardRedirect(res, 'mapsWizardWrongJsonDataError');
        }
        let handler = this.mapsWizardHandlers[selectedHandler];
        if(!handler){
            return this.mapsWizardRedirect(res, 'mapsWizardMissingHandlerError');
        }
        let generatorWithData = false;
        let generatedMap = false;
        try {
            let handlerParams = {mapData, rootFolder: this.themeManager.projectGenerateDataPath};
            if('elements-object-loader' === selectedHandler){
                let loader = new handler(handlerParams);
                await loader.load();
                let generator = new RandomMapGenerator(loader.mapData);
                generatedMap = await generator.generate();
                generatorWithData = generator;
            }
            if('elements-composite-loader' === selectedHandler){
                let loader = new handler(handlerParams);
                await loader.load();
                let generator = new RandomMapGenerator();
                await generator.fromElementsProvider(loader.mapData);
                generatedMap = await generator.generate();
                generatorWithData = generator;
            }
            if('multiple-by-loader' === selectedHandler){
                let generator = new MultipleByLoaderGenerator({loaderData: handlerParams});
                await generator.generate();
                generatorWithData = generator;
            }
            if('multiple-with-association-by-loader' === selectedHandler){
                let generator = new MultipleWithAssociationsByLoaderGenerator({loaderData: handlerParams});
                await generator.generate();
                generatorWithData = generator;
            }
        } catch (error) {
            Logger.error('Maps generator error.', selectedHandler, generatorData, error);
            return this.mapsWizardRedirect(res, 'mapsWizardGeneratorError');
        }
        if(!generatorWithData){
            Logger.error('Maps not generated, incompatible selected handler.', selectedHandler, generatorData);
            return this.mapsWizardRedirect(res, 'mapsWizardSelectedHandlerError');
        }
        let mapsData = {
            maps: [],
            actionPath: this.rootPath+this.mapsWizardPath,
            generatedMapsHandler: selectedHandler,
            importAssociationsForChangePoints: Number(mapData.importAssociationsForChangePoints || 0),
            importAssociationsRecursively: Number(mapData.importAssociationsRecursively || 0),
            verifyTilesetImage: Number(mapData.verifyTilesetImage || 1),
            automaticallyExtrudeMaps: Number(mapData.automaticallyExtrudeMaps || 1)
        };
        if(generatedMap){
            let tileWidth = generatedMap.tilewidth;
            let tileHeight = generatedMap.tileheight;
            let mapFileName = generatorWithData.mapFileName;
            if(-1 === mapFileName.indexOf('json')){
                mapFileName = mapFileName+'.json';
            }
            mapsData.maps.push({
                key: generatorWithData.mapName,
                mapWidth: generatedMap.width * tileWidth,
                mapHeight: generatedMap.height * tileHeight,
                tileWidth,
                tileHeight,
                mapImage: this.rootPath+'/generated/'+generatorWithData.tileSheetName,
                mapJson: this.rootPath+'/generated/'+mapFileName
            });
        }
        if(generatorWithData.generators && generatorWithData.generatedMaps){
            for(let i of Object.keys(generatorWithData.generators)){
                let generator = generatorWithData.generators[i];
                let generatedMap = generatorWithData.generatedMaps[generator.mapName];
                let tileWidth = generatedMap.tilewidth;
                let tileHeight = generatedMap.tileheight;
                let mapFileName = generator.mapFileName;
                if(-1 === mapFileName.indexOf('json')){
                    mapFileName = mapFileName+'.json';
                }
                mapsData.maps.push({
                    key: generator.mapName,
                    mapWidth: generatedMap.width * tileWidth,
                    mapHeight: generatedMap.height * tileHeight,
                    tileWidth,
                    tileHeight,
                    mapImage: this.rootPath+'/generated/'+generator.tileSheetName,
                    mapJson: this.rootPath+'/generated/'+mapFileName
                });
            }
        }
        if(0 === mapsData.maps.length){
            return this.mapsWizardRedirect(res, 'mapsWizardMapsNotGeneratedError');
        }
        return this.mapsWizardMapsSelection(res, mapsData);
    }

    mapsWizardRedirect(res, result)
    {
        return res.redirect(this.rootPath + this.mapsWizardPath + '?result='+result);
    }

    async mapsWizardMapsSelection(res, data)
    {
        let renderedView = await this.render(this.adminFilesContents.mapsWizardMapsSelection, data);
        return res.send(await this.renderRoute(renderedView, this.adminContents.sideBar));
    }

    async importSelectedMaps(req)
    {
        let generatedMapData = this.mapGeneratedMapsDataForImport(req.body);
        if(!generatedMapData){
            return this.rootPath+this.mapsWizardPath+'?result=mapsWizardImportDataError';
        }
        let importResult = await this.mapsImporter.import(generatedMapData);
        if(!importResult){
            let errorCode = this.mapsImporter.errorCode || 'mapsWizardImportError'
            return this.rootPath+this.mapsWizardPath+'?result='+errorCode;
        }
        return this.rootPath+this.mapsWizardPath+'?result=success';
    }

    async importObjects(req)
    {
        let generateObjectsData = sc.toJson(req?.body?.generatorData);
        if(!generateObjectsData){
            let fileName = req.files?.generatorJsonFiles?.shift()?.originalname;
            if(!fileName){
                return this.rootPath+this.skillsImportPath+'?result=objectsImportMissingDataError';
            }
            generateObjectsData = sc.toJson(await FileHandler.fetchFileContents(
                FileHandler.joinPaths(this.themeManager.projectGeneratedDataPath, fileName)
            ));
            if(!generateObjectsData){
                return this.rootPath+this.objectsImportPath+'?result=objectsImportDataError';
            }
        }
        let importResult = await this.objectsImporter.import(generateObjectsData);
        if(!importResult){
            let errorCode = this.objectsImporter.errorCode || 'objectsImportError'
            return this.rootPath+this.objectsImportPath+'?result='+errorCode;
        }
        return this.rootPath+this.objectsImportPath+'?result=success';
    }

    async importSkills(req)
    {
        let generateSkillsData = sc.toJson(req?.body?.generatorData);
        if(!generateSkillsData){
            let fileName = req.files?.generatorJsonFiles?.shift()?.originalname;
            if(!fileName){
                return this.rootPath+this.skillsImportPath+'?result=skillsImportMissingDataError';
            }
            generateSkillsData = sc.toJson(await FileHandler.fetchFileContents(
                FileHandler.joinPaths(this.themeManager.projectGeneratedDataPath, fileName)
            ));
            if(!generateSkillsData){
                return this.rootPath+this.skillsImportPath+'?result=skillsImportDataError';
            }
        }
        let importResult = await this.skillsImporter.import(generateSkillsData);
        if(!importResult){
            let errorCode = this.skillsImporter.errorCode || 'skillsImportError'
            return this.rootPath+this.skillsImportPath+'?result='+errorCode;
        }
        return this.rootPath+this.skillsImportPath+'?result=success';
    }

    mapGeneratedMapsDataForImport(data)
    {
        if(!data.selectedMaps){
            return false;
        }
        let importAssociations = 'multiple-with-association-by-loader' === data.generatedMapsHandler;
        let mappedData = {
            importAssociationsForChangePoints: importAssociations,
            importAssociationsRecursively: importAssociations,
            automaticallyExtrudeMaps: data.automaticallyExtrudeMaps,
            verifyTilesetImage: data.verifyTilesetImage,
            relativeGeneratedDataPath: 'generate-data/generated',
            maps: {}
        };
        for(let mapKey of data.selectedMaps){
            mappedData.maps[data['map-title-'+mapKey]] = mapKey; // for example: {'Town 1': 'town-001'}
        }
        return mappedData;
    }

    async broadcastShutdownMessage()
    {
        let shuttingDownTime = 0 === this.shuttingDownIn ? this.shutdownTime : this.shuttingDownIn;
        await this.broadcastSystemMessage('Server is shutting down in ' + shuttingDownTime + ' seconds.');
    }

    async broadcastSystemMessage(message)
    {
        if(!this.broadcastCallback || !sc.isFunction(this.broadcastCallback)){
            return;
        }
        await this.broadcastCallback({message});
    }

    fetchShuttingDownData()
    {
        if(0 === this.shuttingDownIn){
            return {
                shuttingDownLabel: '',
                shuttingDownTime: '',
                submitLabel: this.translations.labels.submitShutdownLabel || 'Shutdown Server',
                submitType: 'danger',
            };
        }
        return {
            shuttingDownLabel: this.translations.labels.shuttingDown || '',
            shuttingDownTime: this.shuttingDownIn || '',
            submitLabel: this.translations.labels.submitCancelLabel || 'Cancel Server Shutdown',
            submitType: 'warning',
        };
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
        let buckets = {};
        let allowedFileTypes = {};
        for(let uploadPropertyKey of uploadPropertiesKeys){
            let property = uploadProperties[uploadPropertyKey];
            allowedFileTypes[uploadPropertyKey] = property.allowedTypes || false;
            let field = {name: uploadPropertyKey};
            if(!property.isArray){
                field.maxCount = 1;
            }
            fields.push(field);
            buckets[uploadPropertyKey] = property.bucket;
        }
        this.adminRouter.post(
            entityRoute + this.savePath,
            this.isAuthenticated.bind(this),
            this.uploaderFactory.createUploader(fields, buckets, allowedFileTypes),
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
                    FileHandler.removeSync([(property.bucket || ''), entity[propertyKey]]);
                    continue;
                }
                let entityFiles = entity[propertyKey].split(property.isArray);
                for(let entityFile of entityFiles){
                    FileHandler.removeSync([(property.bucket || ''), entityFile]);
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
            if(this.autoSyncDist){
                let uploadProperties = this.fetchUploadProperties(driverResource);
                if(0 < Object.keys(uploadProperties).length){
                    for(let uploadPropertyKey of Object.keys(uploadProperties)){
                        let property = uploadProperties[uploadPropertyKey];
                        await AdminDistHelper.copyBucketFilesToDist(
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
            id
        };
        for(let propertyKey of driverResource.options.showProperties){
            let resourceProperty = driverResource.options.properties[propertyKey];
            let {fieldValue, fieldName} = this.generatePropertyRenderedValueWithLabel(
                loadedEntity,
                propertyKey,
                resourceProperty
            );
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
                if('image' === resourceProperty.allowedTypes){
                    return resourceProperty.allowedTypes + multiple;
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
        this.events.emitSync('reldens.adminIsAuthenticated', event);
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
