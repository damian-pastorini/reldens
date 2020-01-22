/**
 *
 * Reldens - AttackShort
 *
 * Basic short distance attack.
 *
 */

class AttackShort
{

    execute(attacker, defender)
    {
        // @TODO: every action or attack values will be configurable.
        // attack delay is the time in milliseconds until player can attack again:
        this.attackDelay = 500;
        if(attacker.stats.atk >= defender.stats.atk){
            if(defender.stats.hp > 0){
                defender.stats.hp -= 5;
            }
        }
        // avoid getting below 0:
        if(defender.stats.hp < 0){
            defender.stats.hp = 0;
        }
    }

}

module.exports.AttackShort = new AttackShort();
