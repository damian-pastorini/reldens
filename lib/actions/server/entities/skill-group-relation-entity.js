/**
 *
 * Reldens - SkillGroupRelationEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class SkillGroupRelationEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            skill_id: {
                type: 'reference',
                reference: 'skills_skill',
                alias: 'parent_skill',
                isRequired: true
            },
            group_id: {
                type: 'reference',
                reference: 'skills_groups',
                alias: 'parent_group',
                isRequired: true
            }
        };

        let showProperties = Object.keys(properties);
        let editProperties = [...showProperties];
        editProperties.splice(editProperties.indexOf('id'), 1);

        return {
            showProperties,
            editProperties,
            listProperties: showProperties,
            filterProperties: showProperties,
            properties,
            ...extraProps
        };
    }

}

module.exports.SkillGroupRelationEntity = SkillGroupRelationEntity;
