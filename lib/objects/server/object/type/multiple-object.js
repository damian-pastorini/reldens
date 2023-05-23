/**
 *
 * Reldens - MultipleObject
 *
 */

const { BaseObject } = require('./base-object');

class MultipleObject extends BaseObject
{

    constructor(props)
    {
        super(props);
        this.multiple = true;
        this.classInstance = false;
    }

}

module.exports.MultipleObject = MultipleObject;
