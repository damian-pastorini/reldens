/**
 *
 * Reldens - FeaturesModel
 *
 */

class FeaturesModel
{

    constructor(id, code, title, is_enabled)
    {
        this.id = id;
        this.code = code;
        this.title = title;
        this.is_enabled = is_enabled;
    }

    static get tableName()
    {
        return 'features';
    }
    
}

module.exports.FeaturesModel = FeaturesModel;
