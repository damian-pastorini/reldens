/**
 *
 * Reldens - SkillsSkillModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class SkillsSkillModel
{

    constructor(id, key, type, label, autoValidation, skillDelay, castTime, usesLimit, range, rangeAutomaticValidation, rangePropertyX, rangePropertyY, rangeTargetPropertyX, rangeTargetPropertyY, allowSelfTarget, criticalChance, criticalMultiplier, criticalFixedValue, customData, created_at, updated_at)
    {
        this.id = id;
        this.key = key;
        this.type = type;
        this.label = label;
        this.autoValidation = autoValidation;
        this.skillDelay = skillDelay;
        this.castTime = castTime;
        this.usesLimit = usesLimit;
        this.range = range;
        this.rangeAutomaticValidation = rangeAutomaticValidation;
        this.rangePropertyX = rangePropertyX;
        this.rangePropertyY = rangePropertyY;
        this.rangeTargetPropertyX = rangeTargetPropertyX;
        this.rangeTargetPropertyY = rangeTargetPropertyY;
        this.allowSelfTarget = allowSelfTarget;
        this.criticalChance = criticalChance;
        this.criticalMultiplier = criticalMultiplier;
        this.criticalFixedValue = criticalFixedValue;
        this.customData = customData;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static createByProps(props)
    {
        const {id, key, type, label, autoValidation, skillDelay, castTime, usesLimit, range, rangeAutomaticValidation, rangePropertyX, rangePropertyY, rangeTargetPropertyX, rangeTargetPropertyY, allowSelfTarget, criticalChance, criticalMultiplier, criticalFixedValue, customData, created_at, updated_at} = props;
        return new this(id, key, type, label, autoValidation, skillDelay, castTime, usesLimit, range, rangeAutomaticValidation, rangePropertyX, rangePropertyY, rangeTargetPropertyX, rangeTargetPropertyY, allowSelfTarget, criticalChance, criticalMultiplier, criticalFixedValue, customData, created_at, updated_at);
    }
    
}

const schema = new EntitySchema({
    class: SkillsSkillModel,
    tableName: 'skills_skill',
    properties: {
        id: { type: 'number', primary: true },
        key: { type: 'string' },
        type: { type: 'number', persist: false },
        label: { type: 'string', nullable: true },
        autoValidation: { type: 'number', nullable: true },
        skillDelay: { type: 'number' },
        castTime: { type: 'number' },
        usesLimit: { type: 'number', nullable: true },
        range: { type: 'number' },
        rangeAutomaticValidation: { type: 'number', nullable: true },
        rangePropertyX: { type: 'string' },
        rangePropertyY: { type: 'string' },
        rangeTargetPropertyX: { type: 'string', nullable: true },
        rangeTargetPropertyY: { type: 'string', nullable: true },
        allowSelfTarget: { type: 'number', nullable: true },
        criticalChance: { type: 'number', nullable: true },
        criticalMultiplier: { type: 'number', nullable: true },
        criticalFixedValue: { type: 'number', nullable: true },
        customData: { type: 'string', nullable: true },
        created_at: { type: 'Date', nullable: true },
        updated_at: { type: 'Date', nullable: true },
        related_skills_skill_type: {
            kind: 'm:1',
            entity: 'SkillsSkillTypeModel',
            joinColumn: 'type'
        },
        related_objects_skills: {
            kind: '1:m',
            entity: 'ObjectsSkillsModel',
            mappedBy: 'related_skills_skill'
        },
        related_skills_class_path_level_skills: {
            kind: '1:m',
            entity: 'SkillsClassPathLevelSkillsModel',
            mappedBy: 'related_skills_skill'
        },
        related_skills_skill_animations: {
            kind: '1:m',
            entity: 'SkillsSkillAnimationsModel',
            mappedBy: 'related_skills_skill'
        },
        related_skills_skill_attack: {
            kind: '1:1',
            entity: 'SkillsSkillAttackModel',
            mappedBy: 'related_skills_skill'
        },
        related_skills_skill_group_relation: {
            kind: '1:1',
            entity: 'SkillsSkillGroupRelationModel',
            mappedBy: 'related_skills_skill'
        },
        related_skills_skill_owner_conditions: {
            kind: '1:m',
            entity: 'SkillsSkillOwnerConditionsModel',
            mappedBy: 'related_skills_skill'
        },
        related_skills_skill_owner_effects: {
            kind: '1:m',
            entity: 'SkillsSkillOwnerEffectsModel',
            mappedBy: 'related_skills_skill'
        },
        related_skills_skill_physical_data: {
            kind: '1:1',
            entity: 'SkillsSkillPhysicalDataModel',
            mappedBy: 'related_skills_skill'
        },
        related_skills_skill_target_effects: {
            kind: '1:m',
            entity: 'SkillsSkillTargetEffectsModel',
            mappedBy: 'related_skills_skill'
        }
    },
});
schema._fkMappings = {
    "type": {
        "relationKey": "related_skills_skill_type",
        "entityName": "SkillsSkillTypeModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    SkillsSkillModel,
    entity: SkillsSkillModel,
    schema: schema
};
