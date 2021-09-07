/**
 *
 * Reldens - AudioFilesEntity
 *
 */

const { AdminEntityProperties } = require('../../../admin/server/admin-entity-properties');
const { uploadFileFeature } = require('../../../admin/server/upload-file/upload-file.feature');
const { AdminLocalProvider } = require('../../../admin/server/upload-file/admin-local-provider');
const { MimeTypes } = require('../../../admin/server/upload-file/mime-types');
const { sc } = require('@reldens/utils');

class AudioFilesEntity extends AdminEntityProperties
{

    static propertiesConfig(extraProps, projectConfig)
    {
        let properties = {
            id: {},
            audio_id: {
                type: 'reference',
                reference: 'audio',
                isRequired: true
            },
            key: {
                isTitle: true,
                isRequired: true,
                isArray: true
            },
            uploadedFile: {
                isVirtual: true
            }
        };

        let arrayColumns = {key: {splitBy: ','}};

        let showProperties = Object.keys(properties);
        let listPropertiesKeys = [...showProperties];
        let filterProperties = [...showProperties];
        let editPropertiesKeys = [...showProperties];

        showProperties = sc.removeFromArray(showProperties, ['key']);
        listPropertiesKeys = sc.removeFromArray(listPropertiesKeys, ['key']);
        filterProperties = sc.removeFromArray(filterProperties, ['uploadedFile']);
        editPropertiesKeys = sc.removeFromArray(editPropertiesKeys, ['id', 'key']);

        let features = [
            uploadFileFeature({
                provider: new AdminLocalProvider({
                    bucket: AdminLocalProvider.joinPath(projectConfig.bucketFullPath, 'assets', 'audio')
                }),
                properties: {
                    file: 'uploadedFile',
                    key: 'key'
                },
                multiple: true,
                uploadPath: (record, filename) => {
                    return `${filename}`;
                },
                validation: {
                    mimeTypes: MimeTypes.audio
                },
            })
        ];

        return Object.assign({
            listProperties: listPropertiesKeys,
            showProperties: showProperties,
            filterProperties: filterProperties,
            editProperties: editPropertiesKeys,
            properties,
            features,
            arrayColumns,
            bucketPath: '/assets/audio/'
        }, extraProps);
    }

}

module.exports.AudioFilesEntity = AudioFilesEntity;
