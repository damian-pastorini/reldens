/**
 *
 * Reldens - ItemsGroupEntityOverride
 *
 * Admin panel configuration override for items_group entity.
 * Adds file upload support and hot-plug callbacks for live updates.
 *
 */

const { GroupHotPlugCallbacks } = require('../group-hot-plug-callbacks');
const { InventoryConst } = require('../../constants');
const { AllowedFileTypes } = require('../../../game/allowed-file-types');
const { FileHandler } = require('@reldens/server-utils');
const { ItemsGroupEntity } = require('../../../../generated-entities/entities/items-group-entity');
const { sc } = require('@reldens/utils');

class ItemsGroupEntityOverride extends ItemsGroupEntity
{

    /**
     * @param {Object} extraProps
     * @param {Object} projectConfig
     * @returns {Object}
     */
    static propertiesConfig(extraProps, projectConfig)
    {
        let config = super.propertiesConfig(extraProps, projectConfig);
        let bucket = FileHandler.joinPaths(projectConfig.bucketFullPath, 'assets', 'custom', 'groups');
        let bucketPath = '/assets/custom/groups/';
        let distFolder = FileHandler.joinPaths(projectConfig.distPath, 'assets', 'custom', 'groups');
        config.properties['files_name'] = {
            isRequired: false,
            isArray: ',',
            isUpload: true,
            allowedTypes: AllowedFileTypes.IMAGE,
            bucket,
            bucketPath,
            distFolder
        };
        config.listProperties = sc.removeFromArray(config.listProperties, ['items_limit', 'limit_per_item']);
        config.bucketPath = '/' + InventoryConst.GROUP_BUCKET + '/';
        config.bucket = bucket;
        config.callbacks = {
            // @NOTE: we use the update callback because that's when the file_name is updated with the upload plugin.
            afterUpdate: GroupHotPlugCallbacks.afterUpdateCallback(projectConfig, bucket, distFolder),
            beforeDelete: GroupHotPlugCallbacks.beforeDeleteCallback(projectConfig, bucket, distFolder)
        };
        return config;
    }

}

module.exports.ItemsGroupEntityOverride = ItemsGroupEntityOverride;
