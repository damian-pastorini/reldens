/**
 *
 * Reldens - SkillsSkillGroupRelationModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class SkillsSkillGroupRelationModel
{

    constructor(id, skill_id, group_id)
    {
        this.id = id;
        this.skill_id = skill_id;
        this.group_id = group_id;
    }

    static createByProps(props)
    {
        const {id, skill_id, group_id} = props;
        return new this(id, skill_id, group_id);
    }
    
}

const schema = new EntitySchema({
    class: SkillsSkillGroupRelationModel,
    tableName: 'skills_skill_group_relation',
    properties: {
        id: { type: 'number', primary: true },
        skill_id: { type: 'number', persist: false },
        group_id: { type: 'number', persist: false },
        related_skills_skill: {
            kind: 'm:1',
            entity: 'SkillsSkillModel',
            joinColumn: 'skill_id'
        },
        related_skills_groups: {
            kind: 'm:1',
            entity: 'SkillsGroupsModel',
            joinColumn: 'group_id'
        }
    },
});
schema._fkMappings = {
    "skill_id": {
        "relationKey": "related_skills_skill",
        "entityName": "SkillsSkillModel",
        "referencedColumn": "id",
        "nullable": false
    },
    "group_id": {
        "relationKey": "related_skills_groups",
        "entityName": "SkillsGroupsModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    SkillsSkillGroupRelationModel,
    entity: SkillsSkillGroupRelationModel,
    schema: schema
};
