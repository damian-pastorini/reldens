/**
 *
 * Reldens - SharedModifiersGroup
 *
 * Base class of the player groups (teams and clans) with their level and shared properties, that apply their shared
 * modifiers to the joined players and revert them when the players leave. Applying or reverting stops on the first
 * modifier that does not reach the expected state.
 *
 */

const { ModifierConst } = require('@reldens/modifiers');
const { sc } = require('@reldens/utils');

/**
 * @typedef {import('../../rooms/server/state').PlayerState} PlayerState
 * @typedef {import('@reldens/modifiers').Modifier} Modifier
 */
class SharedModifiersGroup
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        /** @type {number|Object} */
        this.level = sc.get(props, 'level', 1);
        /** @type {Object<string, Modifier>} */
        this.modifiers = sc.get(props, 'modifiers', {});
        /** @type {Object} */
        this.sharedProperties = sc.get(props, 'sharedProperties', {});
    }

    /**
     * @param {PlayerState|Object} playerSchema
     * @returns {boolean}
     */
    applyModifiers(playerSchema)
    {
        return this.updateModifiers(playerSchema, 'apply', ModifierConst.MOD_APPLIED);
    }

    /**
     * @param {PlayerState|Object} playerSchema
     * @returns {boolean}
     */
    revertModifiers(playerSchema)
    {
        return this.updateModifiers(playerSchema, 'revert', ModifierConst.MOD_REVERTED);
    }

    /**
     * @param {PlayerState|Object} playerSchema
     * @param {string} modifierMethod
     * @param {number} expectedState
     * @returns {boolean}
     */
    updateModifiers(playerSchema, modifierMethod, expectedState)
    {
        for(let i of Object.keys(this.modifiers)){
            let modifier = this.modifiers[i];
            modifier[modifierMethod](playerSchema);
            if(expectedState !== modifier.state){
                return false;
            }
        }
        return true;
    }

}

module.exports.SharedModifiersGroup = SharedModifiersGroup;
