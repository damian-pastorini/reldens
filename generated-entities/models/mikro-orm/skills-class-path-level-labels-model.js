/**
 *
 * Reldens - SkillsClassPathLevelLabelsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class SkillsClassPathLevelLabelsModel
{

    constructor(id, class_path_id, level_id, label)
    {
        this.id = id;
        this.class_path_id = class_path_id;
        this.level_id = level_id;
        this.label = label;
    }

    static createByProps(props)
    {
        const {id, class_path_id, level_id, label} = props;
        return new this(id, class_path_id, level_id, label);
    }
    
}

const schema = new EntitySchema({
    class: SkillsClassPathLevelLabelsModel,
    tableName: 'skills_class_path_level_labels',
    properties: {
        id: { type: 'number', primary: true },
        class_path_id: { type: 'number', persist: false },
        level_id: { type: 'number', persist: false },
        label: { type: 'string' },
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
        "nullable": false
    },
    "level_id": {
        "relationKey": "related_skills_levels",
        "entityName": "SkillsLevelsModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    SkillsClassPathLevelLabelsModel,
    entity: SkillsClassPathLevelLabelsModel,
    schema: schema
};
