/**
 *
 * Reldens - BattleEndAction
 *
 * Represents the end of a battle action with position and target data.
 *
 */

const { GameConst } = require('../../game/constants');
const { ActionsConst } = require('../constants');

class BattleEndAction
{

    /**
     * @param {number} positionX
     * @param {number} positionY
     * @param {string} targetKey
     * @param {string} lastAttackKey
     */
    constructor(positionX, positionY, targetKey, lastAttackKey)
    {
        this[GameConst.ACTION_KEY] = ActionsConst.BATTLE_ENDED;
        this.x = positionX;
        this.y = positionY;
        this[ActionsConst.DATA_OBJECT_KEY_TARGET] = targetKey
        this[ActionsConst.MESSAGE.DATA.LAST_ATTACK_KEY] = lastAttackKey
    }

}

module.exports.BattleEndAction = BattleEndAction;
