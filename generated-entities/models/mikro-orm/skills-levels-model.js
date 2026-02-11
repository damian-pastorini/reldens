/**
 *
 * Reldens - SkillsLevelsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class SkillsLevelsModel
{

    constructor(id, key, label, required_experience, level_set_id)
    {
        this.id = id;
        this.key = key;
        this.label = label;
        this.required_experience = required_experience;
        this.level_set_id = level_set_id;
    }

    static createByProps(props)
    {
        const {id, key, label, required_experience, level_set_id} = props;
        return new this(id, key, label, required_experience, level_set_id);
    }
    
}

const schema = new EntitySchema({
    class: SkillsLevelsModel,
    tableName: 'skills_levels',
    properties: {
        id: { type: 'number', primary: true },
        key: { type: 'number' },
        label: { type: 'string' },
        required_experience: { type: 'number', nullable: true },
        level_set_id: { type: 'number', persist: false },
        related_skills_levels_set: {
            kind: 'm:1',
            entity: 'SkillsLevelsSetModel',
            joinColumn: 'level_set_id'
        },
        related_skills_class_level_up_animations: {
            kind: '1:m',
            entity: 'SkillsClassLevelUpAnimationsModel',
            mappedBy: 'related_skills_levels'
        },
        related_skills_class_path_level_labels: {
            kind: '1:m',
            entity: 'SkillsClassPathLevelLabelsModel',
            mappedBy: 'related_skills_levels'
        },
        related_skills_class_path_level_skills: {
            kind: '1:m',
            entity: 'SkillsClassPathLevelSkillsModel',
            mappedBy: 'related_skills_levels'
        },
        related_skills_levels_modifiers: {
            kind: '1:m',
            entity: 'SkillsLevelsModifiersModel',
            mappedBy: 'related_skills_levels'
        }
    },
});
schema._fkMappings = {
    "level_set_id": {
        "relationKey": "related_skills_levels_set",
        "entityName": "SkillsLevelsSetModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    SkillsLevelsModel,
    entity: SkillsLevelsModel,
    schema: schema
};
