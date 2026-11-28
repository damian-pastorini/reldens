/**
 *
 * Reldens - PlayerClassPathHandler
 *
 * Validates the class path selected for a new player before the player is created (only an enabled class path is
 * accepted) and stores it once the player exists.
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
     * @param {Object} props.loginData
     * @param {number} props.initialClassPathId
     * @param {Object} props.classPathsById
     * @param {Object} props.creationResult
     * @returns {boolean}
     */
    static validateSelection(props)
    {
        let classPathId = Number(sc.get(props.loginData, 'class_path_select', props.initialClassPathId));
        if(sc.hasOwn(props.classPathsById, classPathId)){
            return true;
        }
        props.creationResult.error = true;
        props.creationResult.message = 'The selected class path is not available, please choose another one.';
        return false;
    }

    /**
     * @param {Object} props
     * @param {Object} props.loginData
     * @param {number} props.initialClassPathId
     * @param {Object} props.player
     * @param {BaseDataServer} props.dataServer
     * @returns {Promise<Object>}
     */
    static async createFromLoginData(props)
    {
        return props.dataServer.getEntity('skillsOwnersClassPath').create({
            class_path_id: Number(sc.get(props.loginData, 'class_path_select', props.initialClassPathId)),
            owner_id: props.player.id,
            currentLevel: 1,
            currentExp: 0
        });
    }

}

module.exports.PlayerClassPathHandler = PlayerClassPathHandler;
