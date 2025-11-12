/**
 *
 * Reldens - SnippetsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class SnippetsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'snippets';
    }
    
    static get relationMappings()
    {
        const { LocaleModel } = require('./locale-model');
        return {
            related_locale: {
                relation: this.BelongsToOneRelation,
                modelClass: LocaleModel,
                join: {
                    from: this.tableName+'.locale_id',
                    to: LocaleModel.tableName+'.id'
                }
            }
        };
    }
}

module.exports.SnippetsModel = SnippetsModel;
