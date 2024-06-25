/**
 *
 * Reldens - ClassPathEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class ClassPathEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {
                isId: true
            },
            key: {
                isRequired: true
            },
            label: {
                isTitle: true
            },
            levels_set_id: {
                type: 'reference',
                reference: 'skills_levels_set',
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

module.exports.ClassPathEntity = ClassPathEntity;
