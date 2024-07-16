/**
 *
 * Reldens - DropsAnimationsEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const { AllowedFileTypes } = require('../../../game/allowed-file-types');
const { FileHandler } = require('../../../game/server/file-handler');
const { sc } = require('@reldens/utils');

class DropsAnimationsEntity extends EntityProperties
{

    static propertiesConfig(extraProps, projectConfig)
    {
        let bucket = FileHandler.joinPaths(projectConfig.bucketFullPath, 'assets', 'custom', 'sprites');
        let properties = {
            id: {
                isId: true
            },
            item_id: {
                type: 'reference',
                reference: 'items_item',
                isRequired: true
            },
            asset_type: {
                isRequired: true
            },
            asset_key: {
                isRequired: true
            },
            file: {
                isRequired: true,
                isUpload: true,
                allowedTypes: AllowedFileTypes.IMAGE,
                bucket
            },
            extra_params: {}
        };

        let showProperties = Object.keys(properties);
        let listProperties = [...showProperties];
        let editProperties = [...showProperties];
        listProperties = sc.removeFromArray(listProperties, ['extra_params']);
        editProperties.splice(editProperties.indexOf('id'), 1);

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

module.exports.DropsAnimationsEntity = DropsAnimationsEntity;
