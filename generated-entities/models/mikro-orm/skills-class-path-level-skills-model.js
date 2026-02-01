/**
 *
 * Reldens - SkillsClassPathLevelSkillsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class SkillsClassPathLevelSkillsModel
{

    constructor(id, class_path_id, level_id, skill_id)
    {
        this.id = id;
        this.class_path_id = class_path_id;
        this.level_id = level_id;
        this.skill_id = skill_id;
    }

    static createByProps(props)
    {
        const {id, class_path_id, level_id, skill_id} = props;
        return new this(id, class_path_id, level_id, skill_id);
    }
    
}

const schema = new EntitySchema({
    class: SkillsClassPathLevelSkillsModel,
    tableName: 'skills_class_path_level_skills',
    properties: {
        id: { type: 'number', primary: true },
        class_path_id: { type: 'number', persist: false },
        level_id: { type: 'number', persist: false },
        skill_id: { type: 'number', persist: false },
        related_skills_class_path: {
            kind: 'm:1',
            entity: 'SkillsClassPathModel',
            joinColumn: 'class_path_id'
        },
        related_skills_levels: {
            kind: 'm:1',
            entity: 'SkillsLevelsModel',
            joinColumn: 'level_id'
        },
        related_skills_skill: {
            kind: 'm:1',
            entity: 'SkillsSkillModel',
            joinColumn: 'skill_id'
        }
    },
});
schema._fkMappings = {
    "class_path_id": {
        "relationKey": "related_skills_class_path",
        "entityName": "SkillsClassPathModel",
        "referencedColumn": "id",
        "nullable": false
    },
    "level_id": {
        "relationKey": "related_skills_levels",
        "entityName": "SkillsLevelsModel",
        "referencedColumn": "id",
        "nullable": false
    },
    "skill_id": {
        "relationKey": "related_skills_skill",
        "entityName": "SkillsSkillModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    SkillsClassPathLevelSkillsModel,
    entity: SkillsClassPathLevelSkillsModel,
    schema: schema
};
