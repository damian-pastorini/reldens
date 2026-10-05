/**
 *
 * Reldens - DropsAnimationsModel
 *
 */

class DropsAnimationsModel
{

    static get tableName()
    {
        return 'drops_animations';
    }

    static get relationMappings()
    {
        return {
            related_items_item: {
                relation: 'BelongsToOneRelation',
                tableName: 'items_item',
                from: 'item_id',
                to: 'id'
            }
        };
    }
}

module.exports.DropsAnimationsModel = DropsAnimationsModel;
