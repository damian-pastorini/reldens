
class AttackShort
{

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
