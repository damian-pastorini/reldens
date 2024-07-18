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
        let titleProperty = 'label';
        let properties = {
            id: {},
            key: {
                isRequired: true
            },
            [titleProperty]: {},
            levels_set_id: {
                type: 'reference',
                reference: 'skills_levels_set',
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
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.ClassPathEntity = ClassPathEntity;
