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
        let titleProperty = 'key';
        let properties = {
            id: {},
            skill_id: {
                type: 'reference',
                reference: 'skills_skill',
                alias: 'parent_skill',
                isRequired: true
            },
            [titleProperty]: {
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

        let showProperties = Object.keys(properties);
        let editProperties = [...showProperties];
        editProperties.splice(editProperties.indexOf('id'), 1);

        return {
            showProperties,
            editProperties,
            listProperties: showProperties,
            filterProperties: showProperties,
            properties,
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.SkillOwnerConditionsEntity = SkillOwnerConditionsEntity;
