/**
 *
 * Reldens - LocaleModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class LocaleModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'locale';
    }

}

module.exports.LocaleModel = LocaleModel;
