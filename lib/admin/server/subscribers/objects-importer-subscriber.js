/**
 *
 * Reldens - ObjectsImporterSubscriber
 *
 * Subscriber that handles objects import functionality in the admin panel.
 * Allows importing game objects data from JSON files or direct form input.
 *
 */

const { ObjectsImporter } = require('../../../import/server/objects-importer');
const { AllowedFileTypes } = require('../../../game/allowed-file-types');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/cms/lib/admin-manager').AdminManager} AdminManager
 * @typedef {import('../../../game/server/theme-manager').ThemeManager} ThemeManager
 * @typedef {import('express').Request} ExpressRequest
 */
class ObjectsImporterSubscriber
{

    /**
     * @param {AdminManager} adminManager
     * @param {ThemeManager} themeManager
     */
    constructor(adminManager, themeManager)
    {
        /** @type {string} */
        this.objectsImportPath = '/objects-import';
        /** @type {string} */
        this.rootPath = '';
        /** @type {ThemeManager} */
        this.themeManager = themeManager;
        /** @type {EventsManager} */
        this.events = adminManager.events;
        /** @type {Function} */
        this.render = adminManager.contentsBuilder.render.bind(adminManager.contentsBuilder);
        /** @type {Function} */
        this.renderRoute = adminManager.contentsBuilder.renderRoute.bind(adminManager.contentsBuilder);
        /** @type {Function} */
        this.isAuthenticated = adminManager.router.isAuthenticated.bind(adminManager.router);
        /** @type {Array<Object>} */
        this.fields = [{name: 'generatorJsonFiles'}];
        /** @type {Object<string, string>} */
        this.buckets = {generatorJsonFiles: this.themeManager.projectGeneratedDataPath};
        /** @type {Object<string, string>} */
        this.allowedFileTypes = {generatorJsonFiles: AllowedFileTypes.TEXT};
        /** @type {Function} */
        this.uploader = adminManager.uploaderFactory.createUploader(this.fields, this.buckets, this.allowedFileTypes);
        /** @type {ObjectsImporter} */
        this.objectsImporter = new ObjectsImporter(adminManager);
        this.listenEvents();
    }

    /**
     * @returns {boolean|void}
     */
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

    /**
     * @param {AdminManager} adminManager
     */
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

    /**
     * @param {ExpressRequest} req
     * @returns {Promise<string>}
     */
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
