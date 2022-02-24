/**
 *
 * Reldens - AnimationsEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class AnimationsEntity extends EntityProperties
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
            classKey: {},
            animationData: {
                isRequired: true
            }
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        listPropertiesKeys.splice(listPropertiesKeys.indexOf('animationData'), 1);
        listPropertiesKeys.splice(listPropertiesKeys.indexOf('classKey'), 1);
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

module.exports.AnimationsEntity = AnimationsEntity;
