/**
 *
 * Reldens - config/initial-user
 *
 * Please do not to modify this file!
 * In order to override any of the default values please create an ".env" file in your project root to change the
 * values you need.
 *
 */

module.exports =  {
    role_id: Number(process.env.RELDENS_INITIAL_ROLE_ID) || 1,
    status: Number(process.env.RELDENS_INITIAL_STATUS) || 1
};
