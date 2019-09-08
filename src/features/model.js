/**
 *
 * Reldens - FeaturesModel
 *
 * Features storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { Model } = require('objection');

class FeaturesModel extends Model
{

    static get tableName()
    {
        return 'features';
    }

}

module.exports = FeaturesModel;
