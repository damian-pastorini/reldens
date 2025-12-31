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
     * @param {Object} props.loginManager
     * @param {Object} props.loginData
     * @param {Object} props.player
     * @param {BaseDataServer} props.dataServer
     * @returns {Promise<Object>}
     */
    static async createFromLoginData(props)
    {
        let {loginManager, loginData, player, dataServer} = props;
        let defaultClassPathId = loginManager.config.get('server/players/actions/initialClassPathId');
        let initialClassPathId = sc.get(loginData, 'class_path_select', defaultClassPathId);
        let data = {
            class_path_id: initialClassPathId,
            owner_id: player.id,
            currentLevel: 1,
            currentExp: 0
        };
        return dataServer.getEntity('skillsOwnersClassPath').create(data);
    }

}

module.exports.PlayerClassPathHandler = PlayerClassPathHandler;
