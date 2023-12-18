/**
 *
 * Reldens - RoomsEntity
 *
 */

const { AdminLocalProvider } = require('../../../admin/server/upload-file/admin-local-provider');
const { uploadFileFeature } = require('../../../admin/server/upload-file/upload-file.feature');
const { MimeTypes } = require('../../../admin/server/upload-file/mime-types');
const { EntityProperties } = require('../../../game/server/entity-properties');
const { RoomsConst } = require('../../constants');
const { sc } = require('@reldens/utils');

class RoomsEntity extends EntityProperties
{

    static propertiesDefinition()
    {
        return {
            id: {},
            name: {
                isTitle: true,
                isRequired: true
            },
            title: {
                isRequired: true
            },
            map_filename: {
                isRequired: true
            },
            uploadedFile: {
                isVirtual: true,
            },
            scene_images: {
                isRequired: true,
                // @TODO - BETA - Fix multiple images upload.
                // isArray: true
            },
            uploadedImagesFile: {
                isVirtual: true
            },
            room_class_key: {}
        };
    }

    static propertiesConfig(extraProps, projectConfig)
    {
        let properties = this.propertiesDefinition();
        // @TODO - BETA - Fix multiple images upload.
        let arrayColumns = {}; // {scene_images: {splitBy: ','}};

        let showProperties = Object.keys(properties);
        let listProperties = [...showProperties];
        let filterProperties = [...showProperties];
        let editProperties = [...showProperties];

        showProperties = sc.removeFromArray(showProperties, ['map_filename', 'scene_images', 'room_class_key']);
        listProperties = sc.removeFromArray(listProperties, ['map_filename', 'scene_images', 'room_class_key']);
        filterProperties = sc.removeFromArray(filterProperties, ['uploadedFile', 'uploadedImagesFile']);
        editProperties = sc.removeFromArray(editProperties, ['id', 'map_filename', 'scene_images']);

        let bucket = AdminLocalProvider.joinPath(projectConfig.bucketFullPath, 'assets', 'maps');

        let features = [
            uploadFileFeature({
                provider: new AdminLocalProvider({
                    bucket: bucket
                }),
                properties: {
                    file: 'uploadedFile',
                    key: 'map_filename',
                    filePath: 'mapFilePath',
                    filesToDelete: 'mapFilesToDelete'
                },
                multiple: false,
                uploadPath: (record, filename) => {
                    return `${filename}`;
                },
                validation: {
                    mimeTypes: MimeTypes.text
                },
                propertiesDefinition: properties
            }),
            uploadFileFeature({
                provider: new AdminLocalProvider({
                    bucket: bucket
                }),
                properties: {
                    file: 'uploadedImagesFile',
                    key: 'scene_images',
                    filePath: 'sceneImagesFilePath',
                    filesToDelete: 'sceneImagesFilesToDelete'
                },
                multiple: false,
                uploadPath: (record, filename) => {
                    return `${filename}`;
                },
                validation: {
                    mimeTypes: MimeTypes.image
                },
                propertiesDefinition: properties
            })
        ];

        return Object.assign({
            listProperties,
            showProperties,
            filterProperties,
            editProperties,
            properties,
            features,
            arrayColumns,
            bucketPath: RoomsConst.MAPS_BUCKET+'/',
        }, extraProps);
    }

}

module.exports.RoomsEntity = RoomsEntity;
