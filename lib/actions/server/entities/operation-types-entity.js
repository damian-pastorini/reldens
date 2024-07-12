/**
 *
 * Reldens - OperationTypesEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class OperationTypesEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'label';
        let properties = {
            id: {},
            [titleProperty]: {},
            key: {}
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

module.exports.OperationTypesEntity = OperationTypesEntity;
