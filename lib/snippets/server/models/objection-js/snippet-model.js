/**
 *
 * Reldens - SnippetModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class SnippetModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'snippets';
    }

    static get relationMappings()
    {
        const { LocaleModel } = require('./locale-model');
        return {
            locale: {
                relation: this.HasOneRelation,
                modelClass: LocaleModel,
                join: {
                    from: this.tableName+'.locale_id',
                    to: LocaleModel.tableName+'.id'
                }
            }
        };
    }

}

module.exports.SnippetModel = SnippetModel;
