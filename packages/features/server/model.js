/**
 *
 * Reldens - FeaturesModel
 *
 * Features storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { ModelClass } = require('@reldens/storage');

class FeaturesModel extends ModelClass
{

    static get tableName()
    {
        return 'features';
    }

}

module.exports.FeaturesModel = FeaturesModel;
