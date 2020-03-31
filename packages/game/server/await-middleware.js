/**
 *
 * Reldens - AwaitMiddleware
 *
 * This class extends Parcel Bundler to make the middleware method async. If the bundler is enabled on Reldens we need
 * to wait for it to finish in order to serve the game client or end the server process with an error if it doesn't.
 *
 */

const Parcel = require('parcel-bundler');
const Server = require('parcel-bundler/lib/Server');

class AwaitMiddleware extends Parcel
{

    async middleware()
    {
        await this.bundle();
        return Server.middleware(this);
    }

}

module.exports.AwaitMiddleware = AwaitMiddleware;
