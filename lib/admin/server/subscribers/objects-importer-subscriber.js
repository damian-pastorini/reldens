/**
 *
 * Reldens - ObjectsImporterSubscriber
 *
 */

const { ObjectsImporter } = require('../../../import/server/objects-importer');
const { AllowedFileTypes } = require('../../../game/allowed-file-types');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class ObjectsImporterSubscriber
{

    constructor(adminManager, themeManager)
    {
        this.objectsImportPath = '/objects-import';
        this.rootPath = '';
        this.themeManager = themeManager;
        this.events = adminManager.events;
        this.render = adminManager.contentsBuilder.render.bind(adminManager.contentsBuilder);
        this.renderRoute = adminManager.contentsBuilder.renderRoute.bind(adminManager.contentsBuilder);
        this.isAuthenticated = adminManager.router.isAuthenticated.bind(adminManager.router);
        this.fields = [{name: 'generatorJsonFiles'}];
        this.buckets = {generatorJsonFiles: this.themeManager.projectGeneratedDataPath};
        this.allowedFileTypes = {generatorJsonFiles: AllowedFileTypes.TEXT};
        this.uploader = adminManager.uploaderFactory.createUploader(this.fields, this.buckets, this.allowedFileTypes);
        this.objectsImporter = new ObjectsImporter(adminManager);
        this.listenEvents();
    }

    listenEvents()
    {
        if(!this.events){
            Logger.error('EventsManager not found on ObjectsImporterSubscriber.');
            return false;
        }
        this.events.on('reldens.setupAdminManagers', async (event) => {
            this.setupRoutes(event.adminManager);
        });
        this.events.on('reldens.eventBuildSideBarBefore', async (event) => {
            if(!event.navigationContents['Wizards']){
                event.navigationContents['Wizards'] = {};
            }
            let translatedLabel = event.adminManager.translations.labels['objectsImport'];
            event.navigationContents['Wizards'][translatedLabel] = await event.adminManager.contentsBuilder.render(
                event.adminManager.adminFilesContents.sideBarItem,
                {name: translatedLabel, path: event.adminManager.rootPath+this.objectsImportPath}
            );
        });
        this.events.on('reldens.buildAdminContentsAfter', async (event) => {
            let pageContent = await this.render(
                event.adminManager.adminFilesContents.objectsImport,
                {actionPath: event.adminManager.rootPath+this.objectsImportPath}
            );
            event.adminManager.contentsBuilder.adminContents.objectsImport = await this.renderRoute(
                pageContent,
                event.adminManager.contentsBuilder.adminContents.sideBar
            );
        });
    }

    setupRoutes(adminManager)
    {
        if('' === this.rootPath){
            this.rootPath = adminManager.rootPath;
        }
        adminManager.router.adminRouter.get(this.objectsImportPath, this.isAuthenticated, async (req, res) => {
            return res.send(await this.render(adminManager.contentsBuilder.adminContents.objectsImport));
        });
        adminManager.router.adminRouter.post(
            this.objectsImportPath,
            this.isAuthenticated,
            this.uploader,
            async (req, res) => {
                return res.redirect(await this.importObjects(req));
            }
        );
    }

    async importObjects(req)
    {
        let generateObjectsData = sc.toJson(req?.body?.generatorData);
        if(!generateObjectsData){
            let fileName = req.files?.generatorJsonFiles?.shift()?.originalname;
            if(!fileName){
                return this.rootPath+this.objectsImportPath+'?result=objectsImportMissingDataError';
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
            let errorCode = this.objectsImporter.errorCode || 'objectsImportError';
            return this.rootPath+this.objectsImportPath+'?result='+errorCode;
        }
        return this.rootPath+this.objectsImportPath+'?result=success';
    }
}

module.exports.ObjectsImporterSubscriber = ObjectsImporterSubscriber;
