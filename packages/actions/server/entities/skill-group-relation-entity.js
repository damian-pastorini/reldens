/**
 *
 * Reldens - SkillGroupRelationEntity
 *
 */

const { AdminEntityProperties } = require('../../../admin/server/admin-entity-properties');

class SkillGroupRelationEntity extends AdminEntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            skill_id: {
                type: 'reference',
                reference: 'skills_skill',
                isRequired: true
            },
            group_id: {
                type: 'reference',
                reference: 'skills_groups',
                isRequired: true
            }
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        editPropertiesKeys.splice(editPropertiesKeys.indexOf('id'), 1);

        return {
            listProperties: listPropertiesKeys,
            showProperties: Object.keys(properties),
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties,
            ...extraProps
        };
    }

}

module.exports.SkillGroupRelationEntity = SkillGroupRelationEntity;
