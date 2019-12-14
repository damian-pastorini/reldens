/**
 *
 * Reldens - AttackShort
 *
 * Basic short distance attack.
 *
 */

class AttackShort
{

    // attack delay is the time in milliseconds until player can attack again:
    attackDelay = 500;

    execute(attacker, defender)
    {
        if(attacker.stats.atk >= defender.stats.atk){
            if(defender.stats.hp > 0){
                defender.stats.hp--;
            }
        }
    }

}

module.exports.AttackShort = new AttackShort();
