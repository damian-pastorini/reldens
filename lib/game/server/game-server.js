/**
 *
 * Reldens - GameServer
 *
 * This class extends Colyseus server to include new features and implement all the custom behaviors.
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
        // @TODO - BETA - Create a Colyseus driver.
        super(options);
        // set shutdown callback:
        this.onShutdown(() => this.runOnShutDown());
    }

    attachMonitor(app, config)
    {
        // @TODO - BETA - Extract into Colyseus driver.
        this.hasAuthentication(config) ? this.attacheSecuredMonitor(config, app) : this.attachUnsecureMonitor(app);
    }

    attachUnsecureMonitor(app)
    {
        app.use('/colyseus', Monitor.monitor(this));
        Logger.info('Attached UNSECURE Monitor at /colyseus.');
    }

    attacheSecuredMonitor(config, app)
    {
        let basicAuthMiddleware = basicAuth({
            users: {[config.user]: config.pass},
            // sends WWW-Authenticate header, which will prompt the user to fill credentials in:
            challenge: true
        });
        app.use('/colyseus', basicAuthMiddleware, Monitor.monitor(this));
        Logger.info('Attached secure Monitor at /colyseus.');
    }

    hasAuthentication(config)
    {
        return config && config.auth && config.user && config.pass;
    }

    runOnShutDown()
    {
        Logger.info('Game Server is going down.');
    }

}

module.exports.GameServer = GameServer;
