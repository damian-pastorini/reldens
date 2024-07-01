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

        let showPropertiesKeys = Object.keys(properties);
        let listPropertiesKeys = [...showPropertiesKeys];
        let editPropertiesKeys = [...listPropertiesKeys];

        editPropertiesKeys.splice(editPropertiesKeys.indexOf('id'), 1);

        return {
            listProperties: listPropertiesKeys,
            showProperties: showPropertiesKeys,
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties,
            ...extraProps
        };
    }

}

module.exports.ObjectsSkillsEntity = ObjectsSkillsEntity;
