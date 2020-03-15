/**
 *
 * Reldens - AttackShort
 *
 * Basic short distance attack.
 *
 */

const { AttackBase } = require('./attack-base');
const { GameConst } = require('../../game/constants');

class AttackShort extends AttackBase
{

    constructor()
    {
        super({
            attackDelay: 500,
            key: 'attack-short',
            canAttack: true,
            range: 50,
            hitDamage: 5
        });
    }

    async execute(attacker, defender, battleType, room)
    {
        room.broadcast({
            act: GameConst.ATTACK,
            atk: attacker.broadcastKey,
            def: defender.broadcastKey,
            type: battleType
        });
        await super.execute(attacker, defender, battleType, room);
        if(
            {}.hasOwnProperty.call(this.attacker, 'player_id')
            && {}.hasOwnProperty.call(this.defender, 'objectBody')
            && this.currentBattle
        ){
            if(this.defender.stats.hp > 0){
                await this.currentBattle.startBattleWith(this.attacker, this.room);
            } else {
                await this.battleEnded(this.attacker, this.room);
            }
        }
        return battleType;
    }

}

module.exports.AttackShort = AttackShort;
