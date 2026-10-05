/**
 *
 * Reldens - SnippetsModel
 *
 */

class SnippetsModel
{

    static get tableName()
    {
        return 'snippets';
    }

    static get relationMappings()
    {
        return {
            related_locale: {
                relation: 'BelongsToOneRelation',
                tableName: 'locale',
                from: 'locale_id',
                to: 'id'
            }
        };
    }
}

module.exports.SnippetsModel = SnippetsModel;
