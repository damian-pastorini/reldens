/**
 *
 * Reldens - config/db
 *
 * Please do not to modify this file!
 * In order to override any of the default values please create an ".env" file in your project root to change the
 * values you need.
 *
 */

module.exports = {
    client: process.env.RELDENS_DB_CLIENT || 'mysql',
    host: process.env.RELDENS_DB_HOST || '10.0.2.2',
    port: Number(process.env.RELDENS_DB_PORT) || 3306,
    database: process.env.RELDENS_DB_NAME || 'reldens',
    user: process.env.RELDENS_DB_USER || 'reldens',
    password: process.env.RELDENS_DB_PASSWORD || 'reldens',
    connectionLimit: Number(process.env.RELDENS_DB_LIMIT) || 10
};
