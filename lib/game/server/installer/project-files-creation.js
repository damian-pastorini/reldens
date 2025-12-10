/**
 *
 * Reldens - ProjectFilesCreation
 *
 * Creates essential project configuration files after database installation.
 * Generates the .env, .gitignore, knexfile.js, and install.lock files from templates.
 * Handles asset cleanup for non-sample installations and an optional server start callback.
 *
 */

const { TemplateEngine } = require('../template-engine');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {Object} ProjectFilesCreationProps
 * @property {Object} themeManager
 * @property {function(): void} [cleanAssetsCallback]
 * @property {function(Object): Promise<void>} [startCallback]
 *
 * @typedef {Object} CreationResult
 * @property {boolean} success
 * @property {string} [error]
 */
class ProjectFilesCreation
{

    /**
     * @param {ProjectFilesCreationProps} props
     */
    constructor(props)
    {
        /** @type {Object} */
        this.themeManager = sc.get(props, 'themeManager');
        /** @type {function(): void|undefined} */
        this.cleanAssetsCallback = sc.get(props, 'cleanAssetsCallback');
        /** @type {function(Object): Promise<void>|undefined} */
        this.startCallback = sc.get(props, 'startCallback');
    }

    /**
     * @param {Object} templateVariables
     * @param {string} storageDriverKey
     * @param {Object} dataServer
     * @returns {Promise<CreationResult>} Result with success flag and optional error code
     */
    async createProjectFiles(templateVariables, storageDriverKey, dataServer)
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
        } catch (error) {
            FileHandler.remove(envFilePath);
            FileHandler.remove(gitignoreFilePath);
            FileHandler.remove(knexFilePath);
            FileHandler.remove(lockFilePath);
            Logger.critical('There was an error during the theme creation process.', error);
            return {success: false, error: 'installation-process-failed'};
        }
        Logger.info('Installation success!');
        if(this.startCallback){
            Logger.info('Running Server Start callback...');
            await this.startCallback({dataServer});
        }
        return {success: true};
    }

}

module.exports.ProjectFilesCreation = ProjectFilesCreation;
