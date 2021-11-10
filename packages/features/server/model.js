/**
 *
 * Reldens - FeaturesModel
 *
 * Features storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { ModelClassDeprecated } = require('@reldens/storage');

class FeaturesModel extends ModelClassDeprecated
{

    static get tableName()
    {
        return 'features';
    }

}

module.exports.FeaturesModel = FeaturesModel;
