/**
 *
 * Reldens - SkillsSkillAnimationsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class SkillsSkillAnimationsModel
{

    constructor(id, skill_id, key, classKey, animationData)
    {
        this.id = id;
        this.skill_id = skill_id;
        this.key = key;
        this.classKey = classKey;
        this.animationData = animationData;
    }

    static createByProps(props)
    {
        const {id, skill_id, key, classKey, animationData} = props;
        return new this(id, skill_id, key, classKey, animationData);
    }
    
}

const schema = new EntitySchema({
    class: SkillsSkillAnimationsModel,
    tableName: 'skills_skill_animations',
    properties: {
        id: { type: 'number', primary: true },
        skill_id: { type: 'number', persist: false },
        key: { type: 'string' },
        classKey: { type: 'string', nullable: true },
        animationData: { type: 'string' },
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
    SkillsSkillAnimationsModel,
    entity: SkillsSkillAnimationsModel,
    schema: schema
};
