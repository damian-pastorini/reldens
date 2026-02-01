/**
 *
 * Reldens - SkillsLevelsSetModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class SkillsLevelsSetModel
{

    constructor(id, key, label, autoFillRanges, autoFillExperienceMultiplier, created_at, updated_at)
    {
        this.id = id;
        this.key = key;
        this.label = label;
        this.autoFillRanges = autoFillRanges;
        this.autoFillExperienceMultiplier = autoFillExperienceMultiplier;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static createByProps(props)
    {
        const {id, key, label, autoFillRanges, autoFillExperienceMultiplier, created_at, updated_at} = props;
        return new this(id, key, label, autoFillRanges, autoFillExperienceMultiplier, created_at, updated_at);
    }
    
}

const schema = new EntitySchema({
    class: SkillsLevelsSetModel,
    tableName: 'skills_levels_set',
    properties: {
        id: { type: 'number', primary: true },
        key: { type: 'string', nullable: true },
        label: { type: 'string', nullable: true },
        autoFillRanges: { type: 'number', nullable: true },
        autoFillExperienceMultiplier: { type: 'number', nullable: true },
        created_at: { type: 'Date', nullable: true },
        updated_at: { type: 'Date', nullable: true },
        related_skills_class_path: {
            kind: '1:m',
            entity: 'SkillsClassPathModel',
            mappedBy: 'related_skills_levels_set'
        },
        related_skills_levels: {
            kind: '1:m',
            entity: 'SkillsLevelsModel',
            mappedBy: 'related_skills_levels_set'
        }
    },
});

module.exports = {
    SkillsLevelsSetModel,
    entity: SkillsLevelsSetModel,
    schema: schema
};
