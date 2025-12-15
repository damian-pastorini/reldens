/**
 *
 * Reldens - GameServer
 *
 * Extends Colyseus Server to provide the game server with integrated monitoring capabilities.
 * Wraps the Colyseus core server and adds support for attaching the Colyseus Monitor
 * with optional authentication. Handles server shutdown gracefully.
 *
 */

const Monitor = require('@colyseus/monitor');
const basicAuth = require('express-basic-auth');
const { Server } = require('@colyseus/core');
const { Logger } = require('@reldens/utils');

/**
 * @typedef {import('express').Application} ExpressApplication
 * @typedef {import('@colyseus/ws-transport').WebSocketTransport} WebSocketTransport
 * @typedef {import('http').Server} HttpServer
 * @typedef {import('https').Server} HttpsServer
 *
 * @typedef {Object} GameServerOptions
 * @property {WebSocketTransport} transport
 * @property {HttpServer|HttpsServer} [server]
 * @property {number} [pingInterval]
 * @property {number} [pingMaxRetries]
 */
class GameServer extends Server
{

    /**
     * @param {GameServerOptions} options
     */
    constructor(options)
    {
        // @TODO - BETA - Create a Colyseus driver.
        super(options);
        this.onShutdown(() => this.runOnShutDown());
    }

    /**
     * @param {ExpressApplication} app
     * @param {Object<string, any>} config
     */
    attachMonitor(app, config)
    {
        // @TODO - BETA - Extract into Colyseus driver.
        this.hasAuthentication(config) ? this.attacheSecuredMonitor(config, app) : this.attachUnsecureMonitor(app);
    }

    /**
     * @param {ExpressApplication} app
     */
    attachUnsecureMonitor(app)
    {
        app.use('/colyseus', Monitor.monitor(this));
        Logger.info('Attached UNSECURE Monitor at /colyseus.');
    }

    /**
     * @param {Object<string, any>} config
     * @param {ExpressApplication} app
     */
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

    /**
     * @param {Object<string, any>} config
     * @returns {boolean}
     */
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
