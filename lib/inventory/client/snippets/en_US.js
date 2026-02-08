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
        lockedForAddItem: 'Inventory locked, cannot add item: %itemUid',
        maxTotalReachedForAddItem: 'Cannot add item, max total reached.',
        itemExistsForAddItem: 'Cannot add item, item already exists: %itemUid',
        itemLimitExceededForAddItem: 'Cannot add item, item qty limit exceeded.',
        addItemsError: 'Cannot add item "%itemUid".',
        lockedForSetItem: 'Inventory locked, cannot set item: %itemUid.',
        lockedForRemoveItem: 'Inventory locked, cannot remove item: %itemUid.',
        keyNotFound: 'Cannot remove item, key not found: %itemUid.',
        lockedForModifyItemQty: 'Inventory locked, cannot modify item qty: %itemUid.',
        undefinedItemKeyForOperation: 'Cannot "%operation" item qty, undefined item key: %itemUid.',
        qtyNotANumber: 'Cannot "%operation" item qty, quantity is not a number: %qty.',
        itemQtyLimitExceeded: 'Cannot "%operation" item qty, item qty limit exceeded: %qty > %limitPerItem.',
        lockedForSetItems: 'Inventory locked, cannot set items.',
        tradeWith: 'Trading with %playerName',
        trade: {
            actions: {
                confirm: 'confirm',
                disconfirm: 'decline',
                cancel: 'cancel',
            }
        },
        exchange: {
            missingConfirmation: 'Missing confirmation.',
            invalidPushedQuantity: 'Invalid item pushed quantity (%qty), available: %pushedItemQty.',
            invalidQuantity: 'Invalid item quantity 0.',
            invalidExchange: 'Inventories "FROM" and "TO" are the same, exchange cancelled.',
            decreaseQuantity: 'Exchange inventory decrease error.',
            itemAdd: 'Exchange add inventory result error.'
        },
        requirements: {
            itemNotPresent: 'Required item "%requiredItemKey" is not present.',
            quantityNotAvailable: 'Required item "%requiredItemKey" quantity %totalRequiredQuantity'
                +' is not available.',
            itemNotPushed: 'Required item "%requiredItemKey" was not pushed for exchange.',
            itemQuantityNotPushed: 'Required item "%requiredItemKey" quantity %totalRequiredQuantity'
                +' was not pushed for exchange.',
            itemDoesNotExists: 'Requirement error, item "%itemUid" does not exits on inventory.',
            itemAdd: 'Requirement add item error.'
        },
        reward: {
            doesNotExists: 'Reward error, item "%itemUid" does not exits.',
            missingItem: 'Reward error, item "%itemUid" does not exits.',
            itemNotPresent: 'Reward item "%rewardItemKey" is not present on inventory.',
            quantityNotAvailable: 'Reward item %rewardItemKey reward quantity (%rewardQuantity) is not available.',
            missingPushed: 'Missing pushed for exchange item "%itemUid".',
            getItemDoesNotExists: 'Reward error, item "%itemUid" does not exits on inventory.',
            processItem: 'Process item reward error, item "%itemUid".',
            processInventory: 'Rewards process inventory error.',
            addItems: 'Rewards error on add items: %itemsKeys.',
            quantityOverload: 'Reward quantity (%rewardQuantityTotal) is bigger than the available in the'
                +' inventory (%rewardInventoryItemQty).'
        },
        equipment: {
            modifiersApply: 'Cannot apply modifiers the item is not equipped: %itemUid',
            modifiersRevert: 'Cannot revert modifiers the item is not equipped: %itemUid',
        }
    }
};
