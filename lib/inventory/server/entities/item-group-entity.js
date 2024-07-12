/**
 *
 * Reldens - ItemGroupEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const { AdminLocalProvider } = require('../../../admin/server/upload-file/admin-local-provider');
const { GroupHotPlugCallbacks } = require('../group-hot-plug-callbacks');
const { InventoryConst } = require('../../constants');
const { sc } = require('@reldens/utils');

class ItemGroupEntity extends EntityProperties
{

    static propertiesConfig(extraProps, projectConfig)
    {
        let titleProperty = 'label';
        let properties = {
            id: {},
            key: {
                isRequired: true
            },
            [titleProperty]: {
                isRequired: true
            },
            description: {},
            files_name: {
                isRequired: false,
                isArray: ',',
                isUpload: true
            },
            sort: {
                type: 'number'
            },
            items_limit: {
                type: 'number',
                isRequired: true
            },
            limit_per_item: {
                type: 'number',
                isRequired: true
            }
        };
        let showProperties = Object.keys(properties);
        let listProperties = [...showProperties];
        let editProperties = [...showProperties];
        listProperties = sc.removeFromArray(listProperties, [
            'files_name',
            'description',
            'items_limit',
            'limit_per_item'
        ]);
        editProperties = sc.removeFromArray(editProperties, ['id']);
        let bucket = AdminLocalProvider.joinPath(projectConfig.bucketFullPath, 'assets', 'custom', 'groups');
        let distFolder = AdminLocalProvider.joinPath(projectConfig.distPath, 'assets', 'custom', 'groups');
        let callbacks = {
            // @NOTE: we use the update callback because that's when the file_name is updated with the upload plugin.
            afterUpdate: GroupHotPlugCallbacks.afterUpdateCallback(projectConfig, bucket, distFolder),
            beforeDelete: GroupHotPlugCallbacks.beforeDeleteCallback(projectConfig, bucket, distFolder)
        };

        return {
            showProperties,
            editProperties,
            listProperties,
            filterProperties: listProperties,
            properties,
            titleProperty,
            bucketPath: '/' + InventoryConst.GROUP_BUCKET + '/',
            callbacks,
            ...extraProps
        };
    }

}

module.exports.ItemGroupEntity = ItemGroupEntity;
