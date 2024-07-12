/**
 *
 * Reldens - ObjectsSkillsEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class ObjectsSkillsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            object_id: {
                type: 'reference',
                reference: 'objects',
                isRequired: true
            },
            skill_id: {
                type: 'reference',
                reference: 'skills_skill',
                isRequired: true
            },
            target_id: {
                type: 'reference',
                reference: 'target_options',
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

module.exports.ObjectsSkillsEntity = ObjectsSkillsEntity;
