/**
 *
 * Reldens - DriverDatabase
 *
 */

const { BaseDatabase } = require('adminjs').default;

class DriverDatabase extends BaseDatabase
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

module.exports.DriverDatabase = DriverDatabase;
