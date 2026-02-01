/**
 *
 * Reldens - OperationTypesModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class OperationTypesModel
{

    constructor(id, label, key)
    {
        this.id = id;
        this.label = label;
        this.key = key;
    }

    static createByProps(props)
    {
        const {id, label, key} = props;
        return new this(id, label, key);
    }
    
}

const schema = new EntitySchema({
    class: OperationTypesModel,
    tableName: 'operation_types',
    properties: {
        id: { type: 'number', primary: true },
        label: { type: 'string', nullable: true },
        key: { type: 'number' },
        related_clan_levels_modifiers: {
            kind: '1:m',
            entity: 'ClanLevelsModifiersModel',
            mappedBy: 'related_operation_types'
        },
        related_items_item_modifiers: {
            kind: '1:m',
            entity: 'ItemsItemModifiersModel',
            mappedBy: 'related_operation_types'
        },
        related_rewards_modifiers: {
            kind: '1:m',
            entity: 'RewardsModifiersModel',
            mappedBy: 'related_operation_types'
        },
        related_skills_levels_modifiers: {
            kind: '1:m',
            entity: 'SkillsLevelsModifiersModel',
            mappedBy: 'related_operation_types'
        },
        related_skills_skill_owner_effects: {
            kind: '1:m',
            entity: 'SkillsSkillOwnerEffectsModel',
            mappedBy: 'related_operation_types'
        },
        related_skills_skill_target_effects: {
            kind: '1:m',
            entity: 'SkillsSkillTargetEffectsModel',
            mappedBy: 'related_operation_types'
        }
    },
});

module.exports = {
    OperationTypesModel,
    entity: OperationTypesModel,
    schema: schema
};
