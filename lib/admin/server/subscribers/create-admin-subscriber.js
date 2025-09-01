/**
 *
 * Reldens - CreateAdminSubscriber
 *
 */

const { AdminManager } = require('@reldens/cms/lib/admin-manager');
const { AdminManagerValidator } = require('@reldens/cms/lib/admin-manager-validator');
const { AdminEntitiesGenerator } = require('@reldens/cms/lib/admin-entities-generator');
const { AdminTemplatesLoader } = require('@reldens/cms/lib/admin-templates-loader');
const { AdminDistHelper } = require('@reldens/cms/lib/admin-dist-helper');
const { DefaultTranslations } = require('@reldens/cms/lib/admin-manager/default-translations');
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
        let themeManager = serverManager.themeManager;
        let adminConfig = {
            events: serverManager.events,
            dataServer,
            authenticationCallback: serverManager.loginManager.roleAuthenticationCallback.bind(
                serverManager.loginManager
            ),
            app: serverManager.app,
            appServerFactory: serverManager.appServerFactory,
            entities: entitiesGenerator.generate(dataServerConfig.loadedEntities, dataServer.entityManager.entities),
            validator: new AdminManagerValidator(),
            autoSyncDistCallback: AdminDistHelper.copyBucketFilesToDist,
            buildAdminCssOnActivation: themeManager.buildAdminCss.bind(themeManager),
            buildAdminScriptsOnActivation: themeManager.buildAdminScripts.bind(themeManager),
            updateAdminAssetsDistOnActivation: themeManager.copyAdminAssetsToDist.bind(themeManager),
            renderCallback: themeManager.templateEngine.render.bind(themeManager.templateEngine),
            secret: EnvVar.nonEmptyString(process.env, 'RELDENS_ADMIN_SECRET', ''),
            rootPath: EnvVar.nonEmptyString(process.env, 'RELDENS_ADMIN_ROUTE_PATH', '/reldens-admin'),
            translations: Object.assign({}, DefaultTranslations, dataServerConfig?.translations || {}),
            adminFilesContents: await AdminTemplatesLoader.fetchAdminFilesContents(themeManager.adminTemplates),
            mimeTypes: MimeTypes,
            allowedExtensions: {
                audio: ['.aac', '.mid', '.midi', '.mp3', '.ogg', '.oga', '.opus', '.wav', '.weba', '.3g2'],
                image: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'],
                text: ['.json', '.jsonld', '.txt']
            },
            ...sc.deepMergeProperties(
                this.fetchConfigurations(serverManager.configManager),
                await this.fetchFilesContents(themeManager)
            )
        };
        serverManager.serverAdmin = new AdminManager(adminConfig);
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
            stylesFilePath: config.getWithoutLogs(path+'stylesPath', '/css/'+GameConst.STRUCTURE.ADMIN_CSS_FILE),
            scriptsFilePath: config.getWithoutLogs(path+'scriptsPath', '/'+GameConst.STRUCTURE.ADMIN_JS_FILE),
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

}

module.exports.CreateAdminSubscriber = CreateAdminSubscriber;
