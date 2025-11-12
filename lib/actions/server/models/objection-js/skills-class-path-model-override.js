/**
 *
 * Reldens - SkillsClassPathModelOverride
 *
 */

const { SkillsClassPathModel } = require(
    '../../../../../generated-entities/models/objection-js/skills-class-path-model'
);

class SkillsClassPathModelOverride extends SkillsClassPathModel
{

    static fullPathData()
    {
        return this.query()
            .withGraphFetched('['
                    +'related_skills_levels_set.related_skills_levels.[related_skills_levels_modifiers],'
                    +'related_skills_class_path_level_labels.[related_skills_levels],'
                    +'related_skills_class_path_level_skills.['
                        +'related_skills_skill(orderByKey).['
                            +'related_skills_skill_attack,'
                            +'related_skills_skill_physical_data,'
                            +'related_skills_skill_owner_conditions,'
                            +'related_skills_skill_owner_effects,'
                            +'related_skills_skill_target_effects'
                        +'],'
                        +'related_skills_levels'
                    +']'
                +']')
            .modifiers({
                orderByKey(builder){
                    builder.orderBy('key');
                }
            });
    }

}

module.exports.SkillsClassPathModelOverride = SkillsClassPathModelOverride;
