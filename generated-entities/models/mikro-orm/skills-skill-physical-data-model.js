/**
 *
 * Reldens - SkillsSkillPhysicalDataModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class SkillsSkillPhysicalDataModel
{

    constructor(id, skill_id, magnitude, objectWidth, objectHeight, validateTargetOnHit)
    {
        this.id = id;
        this.skill_id = skill_id;
        this.magnitude = magnitude;
        this.objectWidth = objectWidth;
        this.objectHeight = objectHeight;
        this.validateTargetOnHit = validateTargetOnHit;
    }

    static createByProps(props)
    {
        const {id, skill_id, magnitude, objectWidth, objectHeight, validateTargetOnHit} = props;
        return new this(id, skill_id, magnitude, objectWidth, objectHeight, validateTargetOnHit);
    }
    
}

const schema = new EntitySchema({
    class: SkillsSkillPhysicalDataModel,
    tableName: 'skills_skill_physical_data',
    properties: {
        id: { type: 'number', primary: true },
        skill_id: { type: 'number', persist: false },
        magnitude: { type: 'number' },
        objectWidth: { type: 'number' },
        objectHeight: { type: 'number' },
        validateTargetOnHit: { type: 'number', nullable: true },
        related_skills_skill: {
            kind: 'm:1',
            entity: 'SkillsSkillModel',
            joinColumn: 'skill_id'
        }
    },
});
schema._fkMappings = {
    "skill_id": {
        "relationKey": "related_skills_skill",
        "entityName": "SkillsSkillModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    SkillsSkillPhysicalDataModel,
    entity: SkillsSkillPhysicalDataModel,
    schema: schema
};
