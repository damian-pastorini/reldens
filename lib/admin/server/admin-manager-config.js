/**
 *
 * Reldens - AdminManagerConfig
 *
 */

const { MapsImporter } = require('../../import/server/maps-importer');
const { PropertiesHandler } = require('../../game/properties-handler');

class AdminManagerConfig extends PropertiesHandler
{
    
    constructor(serverManager)
    {
        super();
        this.events = serverManager?.events;
        this.themeManager = serverManager?.themeManager;
        this.config = serverManager?.configManager;
        this.dataServer = serverManager?.dataServer;
        this.dataServerConfig = serverManager?.dataServerConfig;
        this.gameServer = serverManager?.gameServer;
        this.installer = serverManager?.installer;
        this.loginManager = serverManager?.loginManager;
        this.app = serverManager?.app;
        this.applicationFramework = serverManager?.appServerFactory?.applicationFramework;
        this.fileStorageManager = serverManager?.appServerFactory?.fileStorageManager;
        this.mapsImporter = new MapsImporter(serverManager);
        this.bodyParser = serverManager?.appServerFactory?.bodyParser;
        this.session = serverManager?.appServerFactory?.session;
        this.broadcastCallback = (props) => {
            return serverManager?.serverBroadcast(props);
        };
        this.requiredProperties = Object.keys(this);
    }

}

module.exports.AdminManagerConfig = AdminManagerConfig;
