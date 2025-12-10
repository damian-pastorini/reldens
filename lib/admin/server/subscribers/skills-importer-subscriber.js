/**
 *
 * Reldens - SkillsImporterSubscriber
 *
 * Subscriber that handles skills import functionality in the admin panel.
 * Allows importing skills data from JSON files or direct form input.
 *
 */

const { SkillsImporter } = require('../../../import/server/skills-importer');
const { FileHandler } = require('@reldens/server-utils');
const { AllowedFileTypes } = require('../../../game/allowed-file-types');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/cms/lib/admin-manager').AdminManager} AdminManager
 * @typedef {import('../../../game/server/theme-manager').ThemeManager} ThemeManager
 * @typedef {import('express').Request} ExpressRequest
 */
class SkillsImporterSubscriber
{

    /**
     * @param {AdminManager} adminManager
     * @param {ThemeManager} themeManager
     */
    constructor(adminManager, themeManager)
    {
        /** @type {string} */
        this.skillsImportPath = '/skills-import';
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
        /** @type {SkillsImporter} */
        this.skillsImporter = new SkillsImporter(adminManager);
        this.listenEvents();
    }

    /**
     * @returns {boolean|void}
     */
    listenEvents()
    {
        if(!this.events){
            Logger.error('EventsManager not found on SkillsImporterSubscriber.');
            return false;
        }
        this.events.on('reldens.setupAdminManagers', async (event) => {
            this.setupRoutes(event.adminManager);
        });
        this.events.on('reldens.eventBuildSideBarBefore', async (event) => {
            if(!event.navigationContents['Wizards']){
                event.navigationContents['Wizards'] = {};
            }
            let translatedLabel = event.adminManager.translations.labels['skillsImport'];
            event.navigationContents['Wizards'][translatedLabel] = await event.adminManager.contentsBuilder.render(
                event.adminManager.adminFilesContents.sideBarItem,
                {name: translatedLabel, path: event.adminManager.rootPath+this.skillsImportPath}
            );
        });
        this.events.on('reldens.buildAdminContentsAfter', async (event) => {
            let pageContent = await this.render(
                event.adminManager.adminFilesContents.skillsImport,
                {actionPath: event.adminManager.rootPath+this.skillsImportPath}
            );
            event.adminManager.contentsBuilder.adminContents.skillsImport = await this.renderRoute(
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
        adminManager.router.adminRouter.get(this.skillsImportPath, this.isAuthenticated, async (req, res) => {
            return res.send(await this.render(adminManager.contentsBuilder.adminContents.skillsImport));
        });
        adminManager.router.adminRouter.post(
            this.skillsImportPath,
            this.isAuthenticated,
            this.uploader,
            async (req, res) => {
                return res.redirect(await this.importSkills(req));
            }
        );
    }

    /**
     * @param {ExpressRequest} req
     * @returns {Promise<string>}
     */
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
            let errorCode = this.skillsImporter.errorCode || 'skillsImportError';
            return this.rootPath+this.skillsImportPath+'?result='+errorCode;
        }
        return this.rootPath+this.skillsImportPath+'?result=success';
    }
}

module.exports.SkillsImporterSubscriber = SkillsImporterSubscriber;
