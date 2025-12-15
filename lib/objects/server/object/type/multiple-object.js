/**
 *
 * Reldens - MultipleObject
 *
 * Represents a multiple/respawn object type that can spawn multiple instances.
 *
 */

const { BaseObject } = require('./base-object');

class MultipleObject extends BaseObject
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        super(props);
        /** @type {boolean} */
        this.multiple = true;
        /** @type {Function|false} */
        this.classInstance = false;
    }

}

module.exports.MultipleObject = MultipleObject;
