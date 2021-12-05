/**
 *
 * Reldens - GroupEntity
 *
 */

const { AdminEntityProperties } = require('../../../admin/server/admin-entity-properties');
const { AdminLocalProvider } = require('../../../admin/server/upload-file/admin-local-provider');
const { uploadFileFeature } = require('../../../admin/server/upload-file/upload-file.feature');
const { GroupHotPlugCallbacks } = require('../group-hot-plug-callbacks');
const { MimeTypes } = require('../../../admin/server/upload-file/mime-types');
const { InventoryConst } = require('../../constants');
const { sc } = require('@reldens/utils');

class GroupEntity extends AdminEntityProperties
{

    static propertiesDefinition()
    {
        return {
            id: {},
            key: {
                isRequired: true
            },
            label: {
                isTitle: true,
                isRequired: true
            },
            description: {},
            files_name: {
                isRequired: false,
                isArray: true
            },
            uploadedFile: {
                isVirtual: true
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
    }

    static propertiesConfig(extraProps, projectConfig)
    {
        let properties = this.propertiesDefinition();
        let arrayColumns = {files_name: {splitBy: ','}};

        let showProperties = Object.keys(properties);
        let listProperties = [...showProperties];
        let filterProperties = [...showProperties];
        let editProperties = [...showProperties];

        showProperties = sc.removeFromArray(showProperties, ['files_name']);
        listProperties = sc.removeFromArray(listProperties, [
            'files_name',
            'description',
            'items_limit',
            'limit_per_item'
        ]);
        filterProperties = sc.removeFromArray(filterProperties, ['uploadedFile']);
        editProperties = sc.removeFromArray(editProperties, ['id', 'files_name']);

        let bucket = AdminLocalProvider.joinPath(projectConfig.bucketFullPath, 'assets', 'custom', 'groups');
        let distFolder = AdminLocalProvider.joinPath(projectConfig.distFullPath, 'assets', 'custom', 'groups');

        let features = [
            uploadFileFeature({
                provider: new AdminLocalProvider({
                    bucket: bucket
                }),
                properties: {
                    file: 'uploadedFile',
                    key: 'files_name'
                },
                multiple: false,
                uploadPath: (record, filename) => {
                    return `${filename}`;
                },
                validation: {
                    mimeTypes: MimeTypes.image
                },
            })
        ];

        let callbacks = {
            // @NOTE: we use the update callback because that's when the file_name is updated with the upload plugin.
            update: GroupHotPlugCallbacks.updateCallback(projectConfig, bucket, distFolder),
            beforeDelete: GroupHotPlugCallbacks.beforeDeleteCallback(projectConfig, bucket, distFolder)
        };

        return Object.assign({
            listProperties,
            showProperties,
            filterProperties,
            editProperties,
            properties,
            features,
            arrayColumns,
            bucketPath: '/'+InventoryConst.GROUP_BUCKET+'/',
            callbacks
        }, extraProps);
    }

}

module.exports.GroupEntity = GroupEntity;
