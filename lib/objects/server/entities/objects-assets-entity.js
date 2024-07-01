/**
 *
 * Reldens - ObjectsAssetsEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const { sc } = require('@reldens/utils');

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

        let showPropertiesKeys = Object.keys(properties);
        let listPropertiesKeys = [...showPropertiesKeys];
        let editPropertiesKeys = [...listPropertiesKeys];

        listPropertiesKeys = sc.removeFromArray(listPropertiesKeys, ['file', 'extra_params']);
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

module.exports.ObjectsAssetsEntity = ObjectsAssetsEntity;
