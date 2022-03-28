/**
 *
 * Reldens - SkillOwnerConditionsEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class SkillOwnerConditionsEntity extends EntityProperties
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
            key: {
                isTitle: true,
                isRequired: true
            },
            property_key: {
                isRequired: true
            },
            conditional: {
                isRequired: true
            },
            value: {
                isRequired: true
            },
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

module.exports.SkillOwnerConditionsEntity = SkillOwnerConditionsEntity;
