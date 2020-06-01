/**
 *
 * Reldens - AttackBase
 *
 * Basic attack methods.
 *
 */

const { InteractionArea } = require('../../world/interaction-area');

class AttackBase
{

    constructor(props)
    {
        // @TODO: create configurations for these default values.
        this.attackDelay = {}.hasOwnProperty.call(props, 'attackDelay') ? props.attackDelay : false;
        this.key = {}.hasOwnProperty.call(props, 'key') ? props.key : 'attack-base';
        this.canAttack = {}.hasOwnProperty.call(props, 'canAttack') ? props.canAttack : true;
        this.range = {}.hasOwnProperty.call(props, 'range') ? props.range : 40;
        this.hitDamage = {}.hasOwnProperty.call(props, 'hitDamage') ? props.hitDamage : 1;
        this.room = false;
        this.currentBattle = false;
        this.attacker = false;
        this.defender = false;
    }

    // eslint-disable-next-line no-unused-vars
    validate(attacker, defender)
    {
        // @TODO: every action or attack values will be configurable.
        // attack delay is the time in milliseconds until player can attack again:
        if(!attacker.actions[this.key].canAttack){
            // @NOTE: player could be running an attack already.
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

    isInRange(attacker, defender)
    {
        // validate attack range:
        let interactionArea = new InteractionArea();
        interactionArea.setupInteractionArea(this.range, defender.state.x, defender.state.y);
        return interactionArea.isValidInteraction(attacker.state.x, attacker.state.y);
    }

    // eslint-disable-next-line no-unused-vars
    async execute(attacker, defender, battleType, room)
    {
        // @TODO: modify the damage calculation to involve any other player attribute (like speed, dodge, etc).
        if(defender.stats.hp > 0){
            // @NOTE: this is just a basic example on how using modifiers for atk and def could affect the hit damage.
            let diff = attacker.stats.atk - defender.stats.def;
            let damage = this.hitDamage; // 100%
            if(diff > 0){
                let p = diff < defender.stats.def ? (diff * 100 / defender.stats.def) : 99;
                p = p > 99 ? 99 : p; // maximum modifier percentage to add.
                let additionalDamage = Math.ceil((p * damage / 100));
                damage = damage + additionalDamage;
            }
            if(diff < 0){
                let p = -diff < attacker.stats.atk ? (-diff * 100 / attacker.stats.atk) : 99;
                p = p > 99 ? 99 : p; // maximum modifier percentage to remove.
                let reduceDamage = Math.floor((p * damage / 100));
                damage = damage - reduceDamage;
            }
            defender.stats.hp -= damage;
        }
        // avoid getting below 0:
        if(defender.stats.hp < 0){
            defender.stats.hp = 0;
        }
    }

}

module.exports.AttackBase = AttackBase;
