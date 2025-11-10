/**
 *
 * Reldens - PlayerClassPathHandler
 *
 */

const { sc } = require('@reldens/utils');

class PlayerClassPathHandler
{

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
