/**
 *
 * Reldens - ItemsInventoryEntityOverride
 *
 * Admin panel configuration override for items_inventory entity.
 * Adjusts navigation position in admin menu.
 *
 */

const { ItemsInventoryEntity } = require('../../../../generated-entities/entities/items-inventory-entity');

class ItemsInventoryEntityOverride extends ItemsInventoryEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.navigationPosition = 995;
        return config;
    }

}

module.exports.ItemsInventoryEntityOverride = ItemsInventoryEntityOverride;
