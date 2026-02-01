/**
 *
 * Reldens - SkillsClassPathModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class SkillsClassPathModel
{

    constructor(id, key, label, levels_set_id, enabled, created_at, updated_at)
    {
        this.id = id;
        this.key = key;
        this.label = label;
        this.levels_set_id = levels_set_id;
        this.enabled = enabled;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static createByProps(props)
    {
        const {id, key, label, levels_set_id, enabled, created_at, updated_at} = props;
        return new this(id, key, label, levels_set_id, enabled, created_at, updated_at);
    }
    
}

const schema = new EntitySchema({
    class: SkillsClassPathModel,
    tableName: 'skills_class_path',
    properties: {
        id: { type: 'number', primary: true },
        key: { type: 'string' },
        label: { type: 'string', nullable: true },
        levels_set_id: { type: 'number', persist: false },
        enabled: { type: 'number', nullable: true },
        created_at: { type: 'Date', nullable: true },
        updated_at: { type: 'Date', nullable: true },
        related_skills_levels_set: {
            kind: 'm:1',
            entity: 'SkillsLevelsSetModel',
            joinColumn: 'levels_set_id'
        },
        related_skills_class_level_up_animations: {
            kind: '1:m',
            entity: 'SkillsClassLevelUpAnimationsModel',
            mappedBy: 'related_skills_class_path'
        },
        related_skills_class_path_level_labels: {
            kind: '1:m',
            entity: 'SkillsClassPathLevelLabelsModel',
            mappedBy: 'related_skills_class_path'
        },
        related_skills_class_path_level_skills: {
            kind: '1:m',
            entity: 'SkillsClassPathLevelSkillsModel',
            mappedBy: 'related_skills_class_path'
        },
        related_skills_owners_class_path: {
            kind: '1:m',
            entity: 'SkillsOwnersClassPathModel',
            mappedBy: 'related_skills_class_path'
        }
    },
});
schema._fkMappings = {
    "levels_set_id": {
        "relationKey": "related_skills_levels_set",
        "entityName": "SkillsLevelsSetModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    SkillsClassPathModel,
    entity: SkillsClassPathModel,
    schema: schema
};
