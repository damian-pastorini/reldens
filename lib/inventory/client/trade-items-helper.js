/**
 *
 * Reldens - TradeItemsHelper
 *
 * Helper class for trade items operations.
 *
 */

const { sc } = require('@reldens/utils');

class TradeItemsHelper
{

    /**
     * @param {Object} items
     * @param {string} i
     * @param {Object} itemsManager
     * @returns {Object}
     */
    static createItemInstance(items, i, itemsManager)
    {
        let messageItem = items[i];
        let itemsProps = Object.assign({manager: itemsManager}, messageItem, {uid: i});
        let itemClass = sc.get(
            itemsManager.itemClasses,
            itemsProps.key,
            itemsManager.types.classByTypeId(itemsProps.type)
        );
        let itemInstance = new itemClass(itemsProps);
        itemInstance.quantityDisplay = 1;
        itemInstance.quantityMaxDisplay = Math.max(itemInstance.qty_limit, messageItem.qty);
        return itemInstance;
    }

}

module.exports.TradeItemsHelper = TradeItemsHelper;
