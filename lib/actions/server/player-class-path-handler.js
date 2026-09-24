/**
 *
 * Reldens - PlayerClassPathHandler
 *
 * Creates player class path assignments during login.
 *
 */

const { sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 */
class PlayerClassPathHandler
{

    /**
     * @param {Object} props
     * @param {ConfigManager} props.config
     * @param {Object} props.loginData
     * @param {Object} props.player
     * @param {BaseDataServer} props.dataServer
     * @returns {Promise<Object>}
     */
    static async createFromLoginData(props)
    {
        return props.dataServer.getEntity('skillsOwnersClassPath').create({
            class_path_id: sc.get(
                props.loginData,
                'class_path_select',
                props.config.get('server/players/actions/initialClassPathId')
            ),
            owner_id: props.player.id,
            currentLevel: 1,
            currentExp: 0
        });
    }

}

module.exports.PlayerClassPathHandler = PlayerClassPathHandler;
