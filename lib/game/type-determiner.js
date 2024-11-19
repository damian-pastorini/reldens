/**
 *
 * Reldens - TypeDeterminer
 *
 */

const { sc } = require('@reldens/utils');

class TypeDeterminer
{

    isPlayer(skillOwner)
    {
        // @TODO - BETA - Improve.
        return sc.hasOwn(skillOwner, 'sessionId');
    }

    isObject(skillOwner)
    {
        // @TODO - BETA - Improve.
        return sc.hasOwn(skillOwner, 'key');
    }

}

module.exports.TypeDeterminer = TypeDeterminer;
