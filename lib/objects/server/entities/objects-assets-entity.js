/**
 *
 * Reldens - ObjectsAssetsEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class ObjectsAssetsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            object_asset_id: {
                isId: true
            },
            object_id: {
                type: 'reference',
                reference: 'objects',
                isRequired: true
            },
            asset_type: {
                isRequired: true
            },
            asset_key: {
                isRequired: true
            },
            asset_file: {
                isRequired: true
            },
            extra_params: {}
        };

        let showProperties = Object.keys(properties);
        let listProperties = [...showProperties];
        let editProperties = [...listProperties];
        listProperties.splice(listProperties.indexOf('extra_params'), 1);
        editProperties.splice(editProperties.indexOf('object_asset_id'), 1);

        return {
            showProperties,
            editProperties,
            listProperties,
            filterProperties: listProperties,
            properties,
            ...extraProps
        };
    }

}

module.exports.ObjectsAssetsEntity = ObjectsAssetsEntity;
