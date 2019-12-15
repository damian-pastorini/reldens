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
        // attack delay is the time in milliseconds until player can attack again:
        this.attackDelay = 500;
        if(attacker.stats.atk >= defender.stats.atk){
            if(defender.stats.hp > 0){
                defender.stats.hp--;
            }
        }
    }

}

module.exports.AttackShort = new AttackShort();
