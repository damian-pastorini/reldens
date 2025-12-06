/**
 *
 * Reldens - FeaturesModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class FeaturesModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'features';
    }

}

module.exports.FeaturesModel = FeaturesModel;
