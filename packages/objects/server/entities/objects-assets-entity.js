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
            file_1: {
                isRequired: true
            },
            file_2: {},
            extra_params: {}
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        listPropertiesKeys = sc.removeFromArray(listPropertiesKeys, [
            'file_1',
            'file_2',
            'extra_params'
        ]);
        editPropertiesKeys.splice(editPropertiesKeys.indexOf('id'), 1);

        return Object.assign({
            listProperties: listPropertiesKeys,
            showProperties: Object.keys(properties),
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties
        }, extraProps);
    }

}

module.exports.ObjectsAssetsEntity = ObjectsAssetsEntity;
