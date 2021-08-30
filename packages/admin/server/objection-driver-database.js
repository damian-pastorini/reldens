/**
 *
 * Reldens - ObjectionDriverDatabase
 *
 */

const { BaseDatabase } = require('adminjs');

class ObjectionDriverDatabase extends BaseDatabase
{

    constructor(orm)
    {
        super(orm);
        this.orm = orm;
    }

    resources()
    {
        return this.orm.resources;
    }

    static isAdapterFor(orm)
    {
        return !!orm.initialized;
    }

}

module.exports.ObjectionDriverDatabase = ObjectionDriverDatabase;
