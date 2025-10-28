/**
 *
 * Reldens - ScoresModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ScoresModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'scores';
    }
    
}

module.exports.ScoresModel = ScoresModel;
