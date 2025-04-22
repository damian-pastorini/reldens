/**
 *
 * Reldens - ItemGroupEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const { GroupHotPlugCallbacks } = require('../group-hot-plug-callbacks');
const { InventoryConst } = require('../../constants');
const { AllowedFileTypes } = require('../../../game/allowed-file-types');
const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class ItemGroupEntity extends EntityProperties
{

    static propertiesConfig(extraProps, projectConfig)
    {
        let titleProperty = 'label';
        let bucket = FileHandler.joinPaths(projectConfig.bucketFullPath, 'assets', 'custom', 'groups');
        let bucketPath = '/assets/custom/groups/';
        let distFolder = FileHandler.joinPaths(projectConfig.distPath, 'assets', 'custom', 'groups');
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
                isUpload: true,
                allowedTypes: AllowedFileTypes.IMAGE,
                bucket,
                bucketPath,
                distFolder
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
            bucket,
            callbacks,
            ...extraProps
        };
    }

}

module.exports.ItemGroupEntity = ItemGroupEntity;
