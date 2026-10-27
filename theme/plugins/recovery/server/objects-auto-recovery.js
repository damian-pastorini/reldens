/**
 *
 * Reldens - Theme - ObjectsAutoRecovery
 *
 * Recovers the configured stats of the alive enemies of a room on every tick, up to their initial values. The enemy
 * "autoRecovery" private param overrides the configured amounts ({"hp": 5}) or disables the recovery (false), and the
 * enemies in battle are skipped when "onlyOutOfBattle" is enabled. The life bar is broadcast when the life changed.
 *
 */

const { StatsRecoveryCalculator } = require('./stats-recovery-calculator');
const { ObjectsConst } = require('reldens/lib/objects/constants');
const { UsersConst } = require('reldens/lib/users/constants');
const { ActionsConst } = require('reldens/lib/actions/constants');
const { GameConst } = require('reldens/lib/game/constants');

class ObjectsAutoRecovery
{

    /**
     * @param {Object} room
     * @param {Object} objectsConfig
     * @param {string} lifeProperty
     * @returns {number}
     */
    recoverRoomObjects(room, objectsConfig, lifeProperty)
    {
        if(!objectsConfig){
            return 0;
        }
        if(true !== objectsConfig.enabled){
            return 0;
        }
        let roomObjects = room.objectsManager?.roomObjects;
        if(!roomObjects){
            return 0;
        }
        let recoveredObjects = 0;
        for(let objectIndex of Object.keys(roomObjects)){
            let roomObject = roomObjects[objectIndex];
            if(!this.isRecoverableObject(roomObject, objectsConfig.onlyOutOfBattle)){
                continue;
            }
            let objectAmounts = roomObject.autoRecovery;
            let amounts = objectAmounts && 'object' === typeof objectAmounts ? objectAmounts : objectsConfig.properties;
            let recoveredProperties = StatsRecoveryCalculator.recover(roomObject.stats, roomObject.initialStats, amounts);
            if(0 === recoveredProperties.length){
                continue;
            }
            recoveredObjects++;
            if(-1 === recoveredProperties.indexOf(lifeProperty)){
                continue;
            }
            room.broadcast('*', {
                act: UsersConst.ACTION_LIFEBAR_UPDATE,
                [ActionsConst.DATA_OWNER_TYPE]: ActionsConst.DATA_TYPE_VALUE_OBJECT,
                [ActionsConst.DATA_OWNER_KEY]: roomObject.broadcastKey,
                newValue: roomObject.stats[lifeProperty],
                totalValue: roomObject.initialStats[lifeProperty]
            });
        }
        return recoveredObjects;
    }

    /**
     * @param {Object} roomObject
     * @param {boolean} onlyOutOfBattle
     * @returns {boolean}
     */
    isRecoverableObject(roomObject, onlyOutOfBattle)
    {
        if(ObjectsConst.TYPE_ENEMY !== roomObject?.type){
            return false;
        }
        if(false === roomObject.autoRecovery){
            return false;
        }
        if(GameConst.STATUS.ACTIVE !== roomObject.objectBody?.bodyState?.inState){
            return false;
        }
        if(!onlyOutOfBattle){
            return true;
        }
        return 0 === Object.keys(roomObject.battle?.inBattleWithPlayers || {}).length;
    }

}

module.exports.ObjectsAutoRecovery = ObjectsAutoRecovery;
