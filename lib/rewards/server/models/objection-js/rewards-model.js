/**
 *
 * Reldens - RewardsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class RewardsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'rewards';
    }

    static get relationMappings()
    {
        const { ItemModel } = require('@reldens/items-system/lib/server/storage/models/objection-js/item-model');
        const { ObjectsModel } = require('../../../../objects/server/models/objection-js/objects-model');
        const { RewardsModifiersModel } = require('./rewards-modifiers-model');
        const { DropsAnimationsModel } = require('./drops-animations-model');
        return {
            objects: {
                relation: this.HasOneRelation,
                modelClass: ObjectsModel,
                join: {
                    from: this.tableName + '.object_id',
                    to: ObjectsModel.tableName + '.id'
                }
            },
            items_item: {
                relation: this.HasOneRelation,
                modelClass: ItemModel,
                join: {
                    from: this.tableName + '.item_id',
                    to: ItemModel.tableName + '.id'
                }
            },
            animations: {
                relation: this.HasOneRelation,
                modelClass: DropsAnimationsModel,
                join: {
                    from: this.tableName + '.item_id',
                    to: DropsAnimationsModel.tableName + '.item_id'
                }
            },
            modifier: {
                relation: this.HasOneRelation,
                modelClass: RewardsModifiersModel,
                join: {
                    from: this.tableName + '.modifier_id',
                    to: RewardsModifiersModel.tableName + '.id'
                }
            }
        };
    }

}

module.exports.RewardsModel = RewardsModel;
