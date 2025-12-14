/**
 *
 * Reldens - ItemsItemEntityOverride
 *
 * Admin panel configuration override for items_item entity.
 * Removes verbose fields from list view and adjusts navigation position.
 *
 */

const { ItemsItemEntity } = require('../../../../generated-entities/entities/items-item-entity');
const { sc } = require('@reldens/utils');

class ItemsItemEntityOverride extends ItemsItemEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.listProperties = sc.removeFromArray(config.listProperties, [
            'description',
            'qty_limit',
            'uses_limit',
            'useTimeOut',
            'execTimeOut'
        ]);
        config.navigationPosition = 300;
        return config;
    }

}

module.exports.ItemsItemEntityOverride = ItemsItemEntityOverride;
