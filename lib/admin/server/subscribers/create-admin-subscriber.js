/**
 *
 * Reldens - CreateAdminSubscriber
 *
 */

const { AdminManager } = require('../admin-manager');
const { AdminManagerValidator } = require('../admin-manager-validator');
const { AdminTranslations } = require('../admin-translations');
const { AdminEntitiesGenerator } = require('../admin-entities-generator');
const { MimeTypes } = require('../../../game/mime-types');
const { GameConst } = require('../../../game/constants');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, EnvVar, sc } = require('@reldens/utils');

class CreateAdminSubscriber
{

    async activateAdmin(event)
    {
        let serverManager = sc.get(event, 'serverManager', false);
        if(!this.validate(serverManager)){
            return false;
        }
        let entitiesGenerator = new AdminEntitiesGenerator();
        serverManager.events.emit('reldens.beforeCreateAdminManager', {serverManager});
        let dataServerConfig = serverManager.dataServerConfig;
        let dataServer = serverManager.dataServer;
        serverManager.serverAdmin = new AdminManager({
            events: serverManager.events,
            themeManager: serverManager.themeManager,
            dataServer,
            loginManager: serverManager.loginManager,
            app: serverManager.app,
            appServerFactory: serverManager.appServerFactory,
            entities: entitiesGenerator.generate(dataServerConfig.loadedEntities, dataServer.entityManager.entities),
            validator: new AdminManagerValidator(),
            secret: EnvVar.nonEmptyString(process.env, 'RELDENS_ADMIN_SECRET', ''),
            rootPath: EnvVar.nonEmptyString(process.env, 'RELDENS_ADMIN_ROUTE_PATH', '/reldens-admin'),
            useSecureLogin: EnvVar.boolean(process.env, 'RELDENS_ADMIN_SECURE_LOGIN', false),
            buckets: this.fetchThemesFolders(serverManager.themeManager.themePath),
            translations: AdminTranslations.appendTranslations(dataServerConfig?.translations || {}),
            adminFilesContents: await this.fetchAdminFilesContents(serverManager.themeManager.adminTemplates),
            mimeTypes: MimeTypes,
            allowedExtensions: {
                audio: ['.aac', '.mid', '.midi', '.mp3', '.ogg', '.oga', '.opus', '.wav', '.weba', '.3g2'],
                image: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'],
                text: ['.json', '.jsonld', '.txt']
            },
            ...sc.deepMergeProperties(
                this.fetchConfigurations(serverManager.configManager),
                await this.fetchFilesContents(serverManager.themeManager)
            )
        });
        serverManager.events.emit('reldens.beforeSetupAdminManager', {serverManager});
        await serverManager.serverAdmin.setupAdmin();
        serverManager.events.emit('reldens.afterCreateAdminManager', {serverManager});
    }

    validate(serverManager)
    {
        if(!serverManager){
            Logger.error('ServerManager not found in CreateAdminSubscriber.');
            return false;
        }
        if(!serverManager.events){
            Logger.error('EventsManager not found in CreateAdminSubscriber.');
            return false;
        }
        if(!serverManager.themeManager){
            Logger.error('ThemeManager not found in CreateAdminSubscriber.');
            return false;
        }
        if(!serverManager.configManager){
            Logger.error('ConfigManager not found in CreateAdminSubscriber.');
            return false;
        }
        return true;
    }

    fetchConfigurations(config)
    {
        let path = 'server/admin/';
        return {
            adminRoleId: config.get(path+'roleId', 1),
            buildAdminCssOnActivation: config.getWithoutLogs(path+'buildAdminCssOnActivation', true),
            buildAdminScriptsOnActivation: config.getWithoutLogs(path+'buildAdminScriptsOnActivation', true),
            updateAdminAssetsDistOnActivation: config.getWithoutLogs(path+'updateAdminAssetsDistOnActivation', true),
            stylesFilePath: config.getWithoutLogs(path+'stylesPath', '/css/'+GameConst.STRUCTURE.ADMIN_CSS_FILE),
            scriptsFilePath: config.getWithoutLogs(path+'scriptsPath', '/'+GameConst.STRUCTURE.ADMIN_JS_FILE),
            autoSyncDist: config.getWithoutLogs(path+'autoSyncDist', true),
            branding: {
                companyName: config.getWithoutLogs(path+'companyName', 'Reldens - Administration Panel'),
                logo: config.getWithoutLogs(path+'logoPath', '/assets/web/reldens-your-logo-mage.png'),
                favicon: config.getWithoutLogs(path+'faviconPath', '/assets/web/favicon.ico'),
                copyRight: config.getWithoutLogs(path+'copyRight', '')
            }
        };
    }

    async fetchFilesContents(themeManager)
    {
        return {
            branding: {
                copyRight: await FileHandler.fetchFileContents(
                    FileHandler.joinPaths(
                        themeManager.projectAdminTemplatesPath,
                        themeManager.adminTemplatesList.defaultCopyRight
                    )
                )
            }
        }
    }

    fetchThemesFolders(themePath)
    {
        let allFolders = FileHandler.fetchSubFoldersList(themePath);
        let pluginsIndex = allFolders.indexOf('plugins');
        if(-1 !== pluginsIndex){
            allFolders.splice(pluginsIndex, 1);
        }
        return allFolders;
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

}

module.exports.CreateAdminSubscriber = CreateAdminSubscriber;
