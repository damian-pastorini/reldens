/**
 *
 * Reldens - ObjectsSkillsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class ObjectsSkillsModel
{

    constructor(id, object_id, skill_id, target_id)
    {
        this.id = id;
        this.object_id = object_id;
        this.skill_id = skill_id;
        this.target_id = target_id;
    }

    static createByProps(props)
    {
        const {id, object_id, skill_id, target_id} = props;
        return new this(id, object_id, skill_id, target_id);
    }
    
}

const schema = new EntitySchema({
    class: ObjectsSkillsModel,
    tableName: 'objects_skills',
    properties: {
        id: { type: 'number', primary: true },
        object_id: { type: 'number', persist: false },
        skill_id: { type: 'number', persist: false },
        target_id: { type: 'number', persist: false },
        related_objects: {
            kind: 'm:1',
            entity: 'ObjectsModel',
            joinColumn: 'object_id'
        },
        related_skills_skill: {
            kind: 'm:1',
            entity: 'SkillsSkillModel',
            joinColumn: 'skill_id'
        },
        related_target_options: {
            kind: 'm:1',
            entity: 'TargetOptionsModel',
            joinColumn: 'target_id'
        }
    },
});
schema._fkMappings = {
    "object_id": {
        "relationKey": "related_objects",
        "entityName": "ObjectsModel",
        "referencedColumn": "id",
        "nullable": false
    },
    "skill_id": {
        "relationKey": "related_skills_skill",
        "entityName": "SkillsSkillModel",
        "referencedColumn": "id",
        "nullable": false
    },
    "target_id": {
        "relationKey": "related_target_options",
        "entityName": "TargetOptionsModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    ObjectsSkillsModel,
    entity: ObjectsSkillsModel,
    schema: schema
};
