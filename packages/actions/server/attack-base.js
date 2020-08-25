/**
 *
 * Reldens - AttackBase
 *
 * Basic attack methods.
 *
 */

const { InteractionArea, ErrorManager } = require('@reldens/utils');

class AttackBase
{

    constructor(props)
    {
        if(!{}.hasOwnProperty.call(props, 'key')){
            ErrorManager.error('Missing skill key.');
        }
        this.key = props.key;
        this.skillDelay = {}.hasOwnProperty.call(props, 'skillDelay') ? props.skillDelay : 0;
        this.canActivate = {}.hasOwnProperty.call(props, 'canActivate') ? props.canActivate : true;
        this.range = {}.hasOwnProperty.call(props, 'range') ? props.range : 0;
        this.hitDamage = {}.hasOwnProperty.call(props, 'hitDamage') ? props.hitDamage : 0;
        this.attacker = false;
        this.defender = false;
        this.room = false;
        this.currentBattle = false;
    }

    // eslint-disable-next-line no-unused-vars
    validate(attacker, defender)
    {
        // the delay is the time in milliseconds until player can use the skill again:
        if(!attacker.actions[this.key].canActivate){
            // @NOTE: player could be running an attack already.
            return false;
        }
        if(this.skillDelay > 0){
            attacker.actions[this.key].canActivate = false;
            setTimeout(()=> {
                attacker.actions[this.key].canActivate = true;
            }, this.skillDelay);
        } else {
            attacker.actions[this.key].canActivate = true;
        }
        return true;
    }

    isInRange(attacker, defender)
    {
        // if range is 0 then the attack range is infinity:
        if(this.range === 0){
            return true;
        }
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
