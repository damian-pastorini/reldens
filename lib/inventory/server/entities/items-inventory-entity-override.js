/**
 *
 * Reldens - ItemsInventoryEntityOverride
 *
 */

const { ItemsInventoryEntity } = require('../../../../generated-entities/entities/items-inventory-entity');

class ItemsInventoryEntityOverride extends ItemsInventoryEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.navigationPosition = 995;
        return config;
    }

}

module.exports.ItemsInventoryEntityOverride = ItemsInventoryEntityOverride;
