/**
 *
 * Reldens - TypeDeterminer
 *
 * Utility class for determining the type of game entities (players vs objects). Used primarily in
 * the skills system to identify whether a skill owner or target is a player entity (has sessionId)
 * or a game object entity (has key property). Provides type checking methods for skills, actions,
 * and battle calculations.
 *
 */

const { sc } = require('@reldens/utils');

/**
 * @typedef {import('../users/server/player').Player} Player
 * @typedef {import('../objects/server/object-instance').ObjectInstance} ObjectInstance
 */

class TypeDeterminer
{

    /**
     * @param {Player|ObjectInstance} skillOwner
     * @returns {boolean}
     */
    isPlayer(skillOwner)
    {
        // @TODO - BETA - Improve.
        return sc.hasOwn(skillOwner, 'sessionId');
    }

    /**
     * @param {Player|ObjectInstance} skillOwner
     * @returns {boolean}
     */
    isObject(skillOwner)
    {
        // @TODO - BETA - Improve.
        return sc.hasOwn(skillOwner, 'key');
    }

}

module.exports.TypeDeterminer = TypeDeterminer;
