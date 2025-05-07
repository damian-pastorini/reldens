/**
 *
 * Reldens - SkillsImporterSubscriber
 *
 */

const { SkillsImporter } = require('../../../import/server/skills-importer');
const { FileHandler } = require('@reldens/server-utils');
const { AllowedFileTypes } = require('../../../game/allowed-file-types');
const { Logger, sc } = require('@reldens/utils');

class SkillsImporterSubscriber
{

    constructor(adminManager, themeManager)
    {
        this.skillsImportPath = '/skills-import';
        this.rootPath = '';
        this.themeManager = themeManager;
        this.events = adminManager.events;
        this.render = adminManager.render.bind(adminManager);
        this.renderRoute = adminManager.renderRoute.bind(adminManager);
        this.isAuthenticated = adminManager.isAuthenticated.bind(adminManager);
        this.fields = [{name: 'generatorJsonFiles'}];
        this.buckets = {generatorJsonFiles: this.themeManager.projectGeneratedDataPath};
        this.allowedFileTypes = {generatorJsonFiles: AllowedFileTypes.TEXT};
        this.uploader = adminManager.uploaderFactory.createUploader(this.fields, this.buckets, this.allowedFileTypes);
        this.skillsImporter = new SkillsImporter(adminManager);
        this.listenEvents();
    }

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
            event.navigationContents['Wizards'][translatedLabel] = await event.adminManager.render(
                event.adminManager.adminFilesContents.sideBarItem,
                {name: translatedLabel, path: event.adminManager.rootPath+this.skillsImportPath}
            );
        });
        this.events.on('reldens.buildAdminContentsAfter', async (event) => {
            let pageContent = await this.render(
                event.adminManager.adminFilesContents.skillsImport,
                {actionPath: event.adminManager.rootPath+this.skillsImportPath}
            );
            event.adminManager.adminContents.skillsImport = await this.renderRoute(
                pageContent,
                event.adminManager.adminContents.sideBar
            );
        });
    }

    setupRoutes(adminManager)
    {
        if('' === this.rootPath){
            this.rootPath = adminManager.rootPath;
        }
        adminManager.adminRouter.get(this.skillsImportPath, this.isAuthenticated, async (req, res) => {
            return res.send(await this.render(adminManager.adminContents.skillsImport));
        });
        adminManager.adminRouter.post(
            this.skillsImportPath,
            this.isAuthenticated,
            this.uploader,
            async (req, res) => {
                return res.redirect(await this.importSkills(req));
            }
        );
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
            let errorCode = this.skillsImporter.errorCode || 'skillsImportError';
            return this.rootPath+this.skillsImportPath+'?result='+errorCode;
        }
        return this.rootPath+this.skillsImportPath+'?result=success';
    }
}

module.exports.SkillsImporterSubscriber = SkillsImporterSubscriber;
