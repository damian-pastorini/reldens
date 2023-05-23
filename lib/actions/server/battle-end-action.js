/**
 *
 * Reldens - BattleEndAction
 *
 */

const { GameConst } = require('../../game/constants');
const { ActionsConst } = require('../constants');

class BattleEndAction
{

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
