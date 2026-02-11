/**
 *
 * Reldens - SkillsClassLevelUpAnimationsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class SkillsClassLevelUpAnimationsModel
{

    constructor(id, class_path_id, level_id, animationData)
    {
        this.id = id;
        this.class_path_id = class_path_id;
        this.level_id = level_id;
        this.animationData = animationData;
    }

    static createByProps(props)
    {
        const {id, class_path_id, level_id, animationData} = props;
        return new this(id, class_path_id, level_id, animationData);
    }
    
}

const schema = new EntitySchema({
    class: SkillsClassLevelUpAnimationsModel,
    tableName: 'skills_class_level_up_animations',
    properties: {
        id: { type: 'number', primary: true },
        class_path_id: { type: 'number', persist: false },
        level_id: { type: 'number', persist: false },
        animationData: { type: 'string' },
        related_skills_class_path: {
            kind: 'm:1',
            entity: 'SkillsClassPathModel',
            joinColumn: 'class_path_id'
        },
        related_skills_levels: {
            kind: 'm:1',
            entity: 'SkillsLevelsModel',
            joinColumn: 'level_id'
        }
    },
});
schema._fkMappings = {
    "class_path_id": {
        "relationKey": "related_skills_class_path",
        "entityName": "SkillsClassPathModel",
        "referencedColumn": "id",
        "nullable": true
    },
    "level_id": {
        "relationKey": "related_skills_levels",
        "entityName": "SkillsLevelsModel",
        "referencedColumn": "id",
        "nullable": true
    }
};
module.exports = {
    SkillsClassLevelUpAnimationsModel,
    entity: SkillsClassLevelUpAnimationsModel,
    schema: schema
};
