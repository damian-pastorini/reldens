/**
 *
 * Reldens - ObjectsTypesEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class ObjectsTypesEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'key';
        let properties = {
            id: {},
            [titleProperty]: {
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

module.exports.ObjectsTypesEntity = ObjectsTypesEntity;
