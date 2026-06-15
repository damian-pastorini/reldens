/**
 *
 * Reldens - Default Server Launcher
 *
 * Boots an independent in-process Reldens server from the configured serverPath, the same way the
 * e2e globalSetup does, so the admin integration tests can run against a self-hosted instance.
 *
 */

const { createRequire } = require('module');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class ServerLauncher
{

    serverManager = null;

    async start(config)
    {
        let serverPath = sc.get(config, 'serverPath', '');
        if('' === serverPath){
            Logger.log(100, '', 'The serverPath is not configured in tests/config.json.');
            return false;
        }
        if(!FileHandler.exists(serverPath)){
            Logger.log(100, '', 'The serverPath was not found: '+serverPath);
            return false;
        }
        let port = Number(sc.get(config, 'port', 8080)) + 100;
        this.applyEnvironment(port);
        let serverRequire = createRequire(serverPath+'/package.json');
        let serverConfig = {projectRoot: serverPath};
        if(config.themeName){
            serverConfig.projectThemeName = config.themeName;
        }
        let pluginPath = serverPath+'/theme/plugins/server-plugin';
        if(FileHandler.exists(pluginPath+'.js')){
            serverConfig.customPlugin = serverRequire(pluginPath).ServerPlugin;
        }
        this.serverManager = new (serverRequire('reldens/server').ServerManager)(serverConfig);
        await this.serverManager.createServers();
        await this.serverManager.start();
        return 'http://localhost:'+port;
    }

    applyEnvironment(port)
    {
        process.env.RELDENS_ALLOW_RUN_BUNDLER = '0';
        process.env.RELDENS_ALLOW_BUILD_CLIENT = '0';
        process.env.RELDENS_ALLOW_BUILD_CSS = '0';
        process.env.PORT = String(port);
        process.env.RELDENS_APP_PORT = String(port);
        process.env.RELDENS_PUBLIC_URL = 'http://localhost:'+port;
    }

    async stop()
    {
        if(!this.serverManager){
            return false;
        }
        if(!this.serverManager.gameServer){
            return false;
        }
        await this.serverManager.gameServer.gracefullyShutdown(false);
        return true;
    }

}

module.exports.ServerLauncher = ServerLauncher;
