/**
 *
 * Reldens - config/server
 *
 * Please do not to modify this file!
 * In order to override any of the default values please create an ".env" file in your project root to change the
 * values you need.
 *
 */

module.exports = {
    port: Number(process.env.PORT) || Number(process.env.RELDENS_APP_PORT) || 8080,
    host: process.env.RELDENS_APP_HOST || 'http://localhost',
    monitor: process.env.RELDENS_MONITOR || false
};
