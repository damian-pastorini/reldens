/**
 *
 * Reldens - ProjectFilesCreation
 *
 */

const { TemplateEngine } = require('../template-engine');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class ProjectFilesCreation
{

    constructor(props)
    {
        this.themeManager = sc.get(props, 'themeManager');
        this.cleanAssetsCallback = sc.get(props, 'cleanAssetsCallback');
        this.startCallback = sc.get(props, 'startCallback');
    }

    async createProjectFiles(templateVariables, storageDriverKey)
    {
        let envFilePath = FileHandler.joinPaths(this.themeManager.projectRoot, '.env');
        let gitignoreFilePath = FileHandler.joinPaths(this.themeManager.projectRoot, '.gitignore');
        let knexFilePath = FileHandler.joinPaths(this.themeManager.projectRoot, 'knexfile.js');
        let lockFilePath = FileHandler.joinPaths(this.themeManager.projectRoot, 'install.lock');
        try {
            // env file:
            let envDistTemplate = FileHandler.readFile(this.themeManager.reldensModulePathInstallTemplateEnvDist);
            let envFileContent = await TemplateEngine.render(envDistTemplate, templateVariables);
            FileHandler.writeFile(envFilePath, envFileContent);
            // gitignore:
            let gitignoreFileContent = FileHandler.readFile(
                this.themeManager.reldensModulePathInstallTemplateGitignoreDist
            );
            FileHandler.writeFile(gitignoreFilePath, gitignoreFileContent);
            // knexfile:
            if('objection-js' === storageDriverKey){
                let knexDistTemplate = FileHandler.readFile(this.themeManager.reldensModulePathInstallTemplateKnexDist);
                let knexFileContent = await TemplateEngine.render(knexDistTemplate, templateVariables);
                FileHandler.writeFile(knexFilePath, knexFileContent);
            }
            // install.lock:
            FileHandler.writeFile(lockFilePath, '');
            // clean assets:
            if('1' !== templateVariables['db-sample-data']){
                if(this.cleanAssetsCallback){
                    this.cleanAssetsCallback();
                }
            }
            Logger.info('Installation success!');
            if(this.startCallback){
                Logger.info('Running Server Start callback...');
                await this.startCallback();
            }
            return {success: true};
        } catch (error) {
            if(FileHandler.exists(envFilePath)){
                FileHandler.remove(envFilePath);
            }
            if(FileHandler.exists(gitignoreFilePath)){
                FileHandler.remove(gitignoreFilePath);
            }
            if(FileHandler.exists(knexFilePath)){
                FileHandler.remove(knexFilePath);
            }
            if(FileHandler.exists(lockFilePath)){
                FileHandler.remove(lockFilePath);
            }
            Logger.critical('There was an error during the theme creation process.', error);
            return {success: false, error: 'installation-process-failed'};
        }
    }

}

module.exports.ProjectFilesCreation = ProjectFilesCreation;
