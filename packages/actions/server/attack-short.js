/**
 *
 * Reldens - AttackShort
 *
 * Basic short distance attack.
 *
 */

const { InteractionArea } = require('../../world/interaction-area');

class AttackShort
{

    constructor()
    {
        this.attackDelay = 500;
        this.key = 'attack-short';
        this.canAttack = true;
        this.range = 40;
        this.hitDamage = 5;
    }

    validate(attacker, defender)
    {
        // @TODO: every action or attack values will be configurable.
        // attack delay is the time in milliseconds until player can attack again:
        if(!attacker.actions[this.key].canAttack){
            // @NOTE: player could be running an attack already.
            return false;
        }
        // validate attack range:
        let interactionArea = new InteractionArea();
        interactionArea.setupInteractionArea(this.range, defender.state.x, defender.state.y);
        if(!interactionArea.isValidInteraction(attacker.state.x, attacker.state.y)){
            return false;
        }
        if(this.attackDelay){
            attacker.actions[this.key].canAttack = false;
            setTimeout(()=> {
                attacker.actions[this.key].canAttack = true;
            }, this.attackDelay);
        } else {
            attacker.actions[this.key].canAttack = true;
        }
        return true;
    }

    async execute(attacker, defender)
    {
        if(attacker.stats.atk >= defender.stats.atk){
            if(defender.stats.hp > 0){
                defender.stats.hp -= this.hitDamage;
            }
        }
        // avoid getting below 0:
        if(defender.stats.hp < 0){
            defender.stats.hp = 0;
        }
    }

}

module.exports.AttackShort = AttackShort;
