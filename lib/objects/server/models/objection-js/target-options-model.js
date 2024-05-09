/**
 *
 * Reldens - TargetOptionsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class TargetOptionsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'target_options';
    }

}

module.exports.TargetOptionsModel = TargetOptionsModel;
