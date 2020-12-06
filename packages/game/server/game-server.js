/**
 *
 * Reldens - GameServer
 *
 * This class extends Colyseus server to include new features and implement all the custom behaviors.
 * This will not override any of the code features.
 *
 */

const { Server } = require('colyseus');
const Monitor = require('@colyseus/monitor');
const basicAuth = require('express-basic-auth');
const { Logger } = require('@reldens/utils');

class GameServer extends Server
{

    constructor(options)
    {
        super(options);
        // set shutdown callback:
        this.onShutdown(() => this.runOnShutDown());
    }

    attachMonitor(app, config)
    {
        if(config.auth && config.user && config.pass){
            let users = {};
            users[config.user] = config.pass;
            let basicAuthMiddleware = basicAuth({
                users: users,
                // sends WWW-Authenticate header, which will prompt the user to fill credentials in:
                challenge: true
            });
            app.use('/colyseus', basicAuthMiddleware, Monitor.monitor(this));
        } else {
            app.use('/colyseus', Monitor.monitor(this));
        }
        Logger.info('Attached monitor.');
    }

    runOnShutDown()
    {
        Logger.info('Game Server is going down.');
    }

}

module.exports.GameServer = GameServer;
