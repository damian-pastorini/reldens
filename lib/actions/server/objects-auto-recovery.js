/**
 *
 * Reldens - ObjectsAutoRecovery
 *
 * Recovers the configured stats of the alive enemies of a room on every tick, up to their initial values, once the
 * "startDelayMs" passed since each stat was last seen lowered (every enemy keeps its recovery state in its
 * "autoRecoveryState" property, declared by EnemyObject, the custom enemy classes without it never recover). The enemy
 * "autoRecovery" private param overrides the configured amounts ({"hp": 5}) or
 * disables the recovery (false). With "onlyOutOfBattle" enabled an enemy in battle never recovers and its delay counts
 * from the battle end (the kill, the chase time out or the player leaving the room end it). The life bar is broadcast
 * when the life changed.
 *
 */

const { StatsRecoveryCalculator } = require('./stats-recovery-calculator');
const { ObjectsConst } = require('../../objects/constants');
const { UsersConst } = require('../../users/constants');
const { ActionsConst } = require('../constants');
const { GameConst } = require('../../game/constants');

class ObjectsAutoRecovery
{

    /**
     * @param {Object} room
     * @param {Object} objectsConfig
     * @param {string} lifeProperty
     * @param {number} [now]
     * @returns {number}
     */
    recoverRoomObjects(room, objectsConfig, lifeProperty, now = Date.now())
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
        let startDelayMs = Number(objectsConfig.startDelayMs || ActionsConst.AUTO_RECOVERY.DEFAULTS.START_DELAY_MS);
        let recoveredObjects = 0;
        for(let objectIndex of Object.keys(roomObjects)){
            let roomObject = roomObjects[objectIndex];
            if(!this.isRecoverableObject(roomObject)){
                continue;
            }
            let objectAmounts = roomObject.autoRecovery;
            let amounts = objectAmounts && 'object' === typeof objectAmounts ? objectAmounts : objectsConfig.properties;
            let recoveredProperties = StatsRecoveryCalculator.recover(
                roomObject.stats,
                roomObject.initialStats,
                amounts,
                roomObject.autoRecoveryState,
                {
                    startDelayMs,
                    now,
                    inBattle: Boolean(objectsConfig.onlyOutOfBattle)
                        && 0 < Object.keys(roomObject.battle?.inBattleWithPlayers || {}).length
                }
            );
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
     * @returns {boolean}
     */
    isRecoverableObject(roomObject)
    {
        if(ObjectsConst.TYPE_ENEMY !== roomObject?.type || !roomObject.autoRecoveryState){
            return false;
        }
        if(false === roomObject.autoRecovery){
            return false;
        }
        return GameConst.STATUS.ACTIVE === roomObject.objectBody?.bodyState?.inState;
    }

}

module.exports.ObjectsAutoRecovery = ObjectsAutoRecovery;
