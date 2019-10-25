/**
 *
 * Reldens - BaseObject
 *
 * Every object created will have a position.
 * Objects are just an internal platform definition, different from game items which are in a different module.
 *
 */
class BaseObject
{

    constructor(props)
    {
        // then we will assign all the properties from the storage automatically as part of this object.
        Object.assign(this, props);
        // object position will be calculated based on the index:
        this.x = false;
        this.y = false;
    }

}

module.exports = BaseObject;
