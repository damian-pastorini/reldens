/**
 *
 * Reldens - TemplatesHandler
 *
 */

class TemplatesHandler
{

    static preloadTemplates(preloadScene)
    {
        // @TODO - BETA - Replace by loader replacing snake name file name by camel case for the template key.
        let inventoryTemplatePath = 'assets/features/inventory/templates/';
        // @TODO - BETA - Move the preload HTML as part of the engine driver.
        preloadScene.load.html('inventory', inventoryTemplatePath+'ui-inventory.html');
        preloadScene.load.html('equipment', inventoryTemplatePath+'ui-equipment.html');
        preloadScene.load.html('inventoryItem', inventoryTemplatePath+'item.html');
        preloadScene.load.html('inventoryItemUse', inventoryTemplatePath+'usable.html');
        preloadScene.load.html('inventoryItemEquip', inventoryTemplatePath+'equip.html');
        preloadScene.load.html('inventoryGroup', inventoryTemplatePath+'group.html');
        preloadScene.load.html('inventoryTradeContainer', inventoryTemplatePath+'trade-container.html');
        preloadScene.load.html('inventoryTradePlayerContainer', inventoryTemplatePath+'trade-player-container.html');
        preloadScene.load.html('inventoryTradeRequirements', inventoryTemplatePath+'trade-requirements.html');
        preloadScene.load.html('inventoryTradeRewards', inventoryTemplatePath+'trade-rewards.html');
        preloadScene.load.html('inventoryTradeAction', inventoryTemplatePath+'trade-action.html');
        preloadScene.load.html('inventoryTradeActionRemove', inventoryTemplatePath+'trade-action-remove.html');
        preloadScene.load.html('inventoryTradeItem', inventoryTemplatePath+'trade-item.html');
        preloadScene.load.html('inventoryTradeItemQuantity', inventoryTemplatePath+'trade-item-quantity.html');
        preloadScene.load.html('inventoryTradeStart', inventoryTemplatePath+'trade-start.html');
        preloadScene.load.html('inventoryTradeAccept', inventoryTemplatePath+'trade-accept.html');
    }

}

module.exports.TemplatesHandler = TemplatesHandler;
