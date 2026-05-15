/**
 *
 * Reldens - ColyseusDriver / Server
 *
 * Reldens-side wrapper around Colyseus Server. Subclasses can be added in the
 * Reldens codebase by extending this class; future Colyseus version upgrades
 * only touch this file.
 *
 */

const { Server: ColyseusServer } = require('@colyseus/core');

class Server extends ColyseusServer
{
}

module.exports.Server = Server;
