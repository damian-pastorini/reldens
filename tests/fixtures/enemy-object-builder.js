/**
 *
 * Reldens - EnemyObjectBuilder
 *
 * Builds a real EnemyObject of the forest respawn area with the given private params, the initial stats hp 10 and the
 * chase time out 0, and events and storage that do nothing.
 *
 */

const { EnemyObject } = require('../../lib/objects/server/object/type/enemy-object');
const { ActionsConst } = require('../../lib/actions/constants');
const { sc } = require('@reldens/utils');

class EnemyObjectBuilder
{

    /**
     * @param {Object} privateParams
     * @returns {EnemyObject}
     */
    static createEnemy(privateParams)
    {
        let configValues = {[ActionsConst.PVE.CONFIG_PATHS.CHASE_TIME_OUT]: 0, 'server/enemies/initialStats': {hp: 10}};
        let config = {get: (path, defaultValue) => sc.get(configValues, path, defaultValue)};
        config.getWithoutLogs = config.get;
        return new EnemyObject({
            id: 1,
            layer_name: 'respawn-area-monsters-lvl-1-2',
            client_key: 'enemy_forest_1',
            private_params: sc.toJsonString(privateParams),
            events: {on: () => true, onWithKey: () => true, emit: async () => true},
            config,
            dataServer: {getEntity: () => false}
        });
    }

}

module.exports.EnemyObjectBuilder = EnemyObjectBuilder;
