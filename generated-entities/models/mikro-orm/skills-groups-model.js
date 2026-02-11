/**
 *
 * Reldens - SkillsGroupsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class SkillsGroupsModel
{

    constructor(id, key, label, description, sort)
    {
        this.id = id;
        this.key = key;
        this.label = label;
        this.description = description;
        this.sort = sort;
    }

    static createByProps(props)
    {
        const {id, key, label, description, sort} = props;
        return new this(id, key, label, description, sort);
    }
    
}

const schema = new EntitySchema({
    class: SkillsGroupsModel,
    tableName: 'skills_groups',
    properties: {
        id: { type: 'number', primary: true },
        key: { type: 'string' },
        label: { type: 'string' },
        description: { type: 'string' },
        sort: { type: 'number', nullable: true },
        related_skills_skill_group_relation: {
            kind: '1:m',
            entity: 'SkillsSkillGroupRelationModel',
            mappedBy: 'related_skills_groups'
        }
    },
});

module.exports = {
    SkillsGroupsModel,
    entity: SkillsGroupsModel,
    schema: schema
};
