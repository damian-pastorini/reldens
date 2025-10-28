/**
 *
 * Reldens - ItemsItemModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ItemsItemModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'items_item';
    }
    

    static get relationMappings()
    {
        const { ItemsTypesModel } = require('./items-types-model');
        const { ItemsGroupModel } = require('./items-group-model');
        const { DropsAnimationsModel } = require('./drops-animations-model');
        const { ItemsInventoryModel } = require('./items-inventory-model');
        const { ItemsItemModifiersModel } = require('./items-item-modifiers-model');
        const { ObjectsItemsInventoryModel } = require('./objects-items-inventory-model');
        const { ObjectsItemsRequirementsModel } = require('./objects-items-requirements-model');
        const { ObjectsItemsRewardsModel } = require('./objects-items-rewards-model');
        const { RewardsModel } = require('./rewards-model');
        return {
            related_items_types: {
                relation: this.BelongsToOneRelation,
                modelClass: ItemsTypesModel,
                join: {
                    from: this.tableName+'.type',
                    to: ItemsTypesModel.tableName+'.id'
                }
            },
            related_items_group: {
                relation: this.BelongsToOneRelation,
                modelClass: ItemsGroupModel,
                join: {
                    from: this.tableName+'.group_id',
                    to: ItemsGroupModel.tableName+'.id'
                }
            },
            related_drops_animations: {
                relation: this.HasManyRelation,
                modelClass: DropsAnimationsModel,
                join: {
                    from: this.tableName+'.id',
                    to: DropsAnimationsModel.tableName+'.item_id'
                }
            },
            related_items_inventory: {
                relation: this.HasManyRelation,
                modelClass: ItemsInventoryModel,
                join: {
                    from: this.tableName+'.id',
                    to: ItemsInventoryModel.tableName+'.item_id'
                }
            },
            related_items_item_modifiers: {
                relation: this.HasManyRelation,
                modelClass: ItemsItemModifiersModel,
                join: {
                    from: this.tableName+'.id',
                    to: ItemsItemModifiersModel.tableName+'.item_id'
                }
            },
            related_objects_items_inventory: {
                relation: this.HasManyRelation,
                modelClass: ObjectsItemsInventoryModel,
                join: {
                    from: this.tableName+'.id',
                    to: ObjectsItemsInventoryModel.tableName+'.item_id'
                }
            },
            related_objects_items_requirements: {
                relation: this.HasManyRelation,
                modelClass: ObjectsItemsRequirementsModel,
                join: {
                    from: this.tableName+'.key',
                    to: ObjectsItemsRequirementsModel.tableName+'.required_item_key'
                }
            },
            related_objects_items_rewards: {
                relation: this.HasManyRelation,
                modelClass: ObjectsItemsRewardsModel,
                join: {
                    from: this.tableName+'.key',
                    to: ObjectsItemsRewardsModel.tableName+'.reward_item_key'
                }
            },
            related_rewards: {
                relation: this.HasManyRelation,
                modelClass: RewardsModel,
                join: {
                    from: this.tableName+'.id',
                    to: RewardsModel.tableName+'.item_id'
                }
            }
        };
    }
}

module.exports.ItemsItemModel = ItemsItemModel;
