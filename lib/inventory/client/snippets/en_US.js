/**
 *
 * Reldens - Translations - en_US
 *
 */

module.exports = {
    items: {
        undefinedItem: 'Add item error, undefined item.',
        undefinedMethodInventoryId: 'Add item error, undefined getInventoryId.',
        undefinedItemKey: 'Add item error, undefined item key.',
        invalidItemInstance: 'Invalid item instance.',
        lockedForAddItem: 'Inventory locked, cannot add item: %item',
        maxTotalReachedForAddItem: 'Cannot add item, max total reached.',
        itemExistsForAddItem: 'Cannot add item, item already exists: %item',
        itemLimitExceededForAddItem: 'Cannot add item, item qty limit exceeded.',
        addItemsError: 'Cannot add item "%item".',
        lockedForSetItem: 'Inventory locked, cannot set item: %item.',
        lockedForRemoveItem: 'Inventory locked, cannot remove item: %item.',
        keyNotFound: 'Cannot remove item, key not found: %item.',
        lockedForModifyItemQty: 'Inventory locked, cannot modify item qty: %item.',
        undefinedItemKeyForOperation: 'Cannot "%operation" item qty, undefined item key: %item.',
        qtyNotANumber: 'Cannot "%operation" item qty, quantity is not a number: %qty.',
        itemQtyLimitExceeded: 'Cannot "%operation" item qty, item qty limit exceeded: %qty > %limitPerItem.',
        lockedForSetItems: 'Inventory locked, cannot set items.',
        tradeWith: 'Trading with %playerName',
        exchange: {
            missingConfirmation: 'Missing confirmation.',
            invalidPushedQuantity: 'Invalid item pushed quantity (%qty), available: %pushedItemQty.',
            invalidQuantity: 'Invalid item quantity 0.',
            invalidExchange: 'Inventories "FROM" and "TO" are the same, exchange cancelled.',
            decreaseQuantity: 'Exchange inventory decrease error.',
            itemAdd: 'Exchange add inventory result error.'
        },
        requirements: {
            itemNotPresent: 'Required item "%requiredItem" is not present.',
            quantityNotAvailable: 'Required item "%requiredItem" quantity %totalRequiredQuantity'
                +' is not available.',
            itemNotPushed: 'Required item "%requiredItem" was not pushed for exchange.',
            itemQuantityNotPushed: 'Required item "%requiredItem" quantity %totalRequiredQuantity'
                +' was not pushed for exchange.',
            itemDoesNotExists: 'Requirement error, item "%item" does not exits on inventory.',
            itemAdd: 'Requirement add item error.'
        },
        reward: {
            doesNotExists: 'Reward error, item "%item" does not exits.',
            missingItem: 'Reward error, item "%item" does not exits.',
            itemNotPresent: 'Reward item "%rewardItem" is not present on inventory.',
            quantityNotAvailable: 'Reward item %rewardItem reward quantity (%rewardQuantity) is not available.',
            missingPushed: 'Missing pushed for exchange item "%item".',
            getItemDoesNotExists: 'Reward error, item "%item" does not exits on inventory.',
            processItem: 'Process item reward error, item "%item".',
            processInventory: 'Rewards process inventory error.',
            addItems: 'Rewards error on add items: %items.',
            quantityOverload: 'Reward quantity (%rewardQuantityTotal) is bigger than the available in the'
                +' inventory (%rewardInventoryItemQty).'
        },
        equipment: {
            modifiersApply: 'Cannot apply modifiers the item is not equipped: %item',
            modifiersRevert: 'Cannot revert modifiers the item is not equipped: %item',
        }
    }
};
