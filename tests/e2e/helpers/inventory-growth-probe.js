/**
 *
 * Reldens - Inventory Growth Probe
 *
 * Server side e2e endpoints for the growing items of a live player inventory: the inventory items (inventory id, stored
 * row id, key, equipped, growth level and experience and the current and original value of every modifier); a method of
 * one inventory item or of the inventory growth applier delayed or failed for the spec group (LiveObjectsOverrides,
 * counted per item or applier and method), like the item unequip that fails in the middle of a level up or the growth
 * save that fails on the storage; and experience added to the player class path directly, the experience a player gets
 * from something that is not a kill (a quest or a reward).
 *
 */

const { LiveObjectsOverrides } = require('./live-objects-overrides');
const { RoomObjectsState } = require('./room-objects-state');
const { Logger, sc } = require('@reldens/utils');

class InventoryGrowthProbe
{

    static ITEM_CALLS_PREFIX = 'item.';
    static APPLIER_CALLS_KEY = 'itemsGrowthApplier';

    static mapModifiers(item)
    {
        let modifiers = sc.get(item, 'modifiers', {});
        return Object.keys(modifiers).map(modifierId => ({
            key: modifiers[modifierId].key,
            propertyKey: modifiers[modifierId].propertyKey,
            value: modifiers[modifierId].value,
            originalValue: modifiers[modifierId].originalValue
        }));
    }

    static fetchInventory(room, playerName)
    {
        let manager = RoomObjectsState.findPlayerByName(room, playerName)?.inventory?.manager;
        if(!manager){
            return {error: 'Inventory of '+playerName+' not found in room '+room.roomName+'.'};
        }
        return {manager};
    }

    static mapItem(inventoryId, item)
    {
        return {
            inventoryId,
            id: item.id,
            key: item.key,
            equipped: Boolean(item.equipped),
            growthLevel: sc.get(item, 'growthLevel', false),
            growthExperience: sc.get(item, 'growthExperience', false),
            modifiers: InventoryGrowthProbe.mapModifiers(item)
        };
    }

    static fetchItems(room, playerName)
    {
        let found = InventoryGrowthProbe.fetchInventory(room, playerName);
        if(found.error){
            return found;
        }
        return {
            items: Object.keys(found.manager.items).map(
                inventoryId => InventoryGrowthProbe.mapItem(inventoryId, found.manager.items[inventoryId])
            )
        };
    }

    static overrideItemMethod(room, groupKey, playerName, inventoryId, methodKey, behavior)
    {
        let found = InventoryGrowthProbe.fetchInventory(room, playerName);
        if(found.error){
            return found;
        }
        let item = found.manager.items[inventoryId];
        if(!item){
            return {error: 'Item '+inventoryId+' not found in the inventory of '+playerName+'.'};
        }
        return LiveObjectsOverrides.overrideMethod(
            groupKey,
            item,
            methodKey,
            Object.assign({callsKey: InventoryGrowthProbe.ITEM_CALLS_PREFIX+inventoryId}, behavior)
        );
    }

    static async addPlayerExperience(room, playerName, experience)
    {
        let classPath = RoomObjectsState.findPlayerByName(room, playerName)?.skillsServer?.classPath;
        if(!classPath){
            return {error: 'Class path of '+playerName+' not found in room '+room.roomName+'.'};
        }
        await classPath.addExperience(experience);
        return {experience: classPath.currentExp};
    }

    static fetchBehavior(request)
    {
        return {
            delayMs: Number(sc.get(request.body, 'delayMs', 0)),
            failuresCount: Number(sc.get(request.body, 'failuresCount', 0)),
            rejects: true === sc.get(request.body, 'rejects', false)
        };
    }

    static registerEndpoints(serverManager)
    {
        let app = serverManager.app;
        app.get('/api/e2e/inventory/items', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.query, 'roomName', ''),
                response,
                async (room) => InventoryGrowthProbe.fetchItems(room, sc.get(request.query, 'playerName', ''))
            );
        });
        app.post('/api/e2e/inventory/item-method-override', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => InventoryGrowthProbe.overrideItemMethod(
                    room,
                    sc.get(request.body, 'group', ''),
                    sc.get(request.body, 'playerName', ''),
                    String(sc.get(request.body, 'inventoryId', '')),
                    String(sc.get(request.body, 'methodKey', '')),
                    InventoryGrowthProbe.fetchBehavior(request)
                )
            );
        });
        app.post('/api/e2e/inventory/growth-applier-override', (request, response) => {
            response.json(LiveObjectsOverrides.overrideMethod(
                sc.get(request.body, 'group', ''),
                serverManager.featuresManager.featuresList.inventory.package.itemsGrowthApplier,
                String(sc.get(request.body, 'methodKey', '')),
                Object.assign({callsKey: InventoryGrowthProbe.APPLIER_CALLS_KEY}, InventoryGrowthProbe.fetchBehavior(request))
            ));
        });
        app.post('/api/e2e/inventory/player-experience', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => await InventoryGrowthProbe.addPlayerExperience(
                    room,
                    sc.get(request.body, 'playerName', ''),
                    Number(sc.get(request.body, 'experience', 0))
                )
            );
        });
        Logger.info('[inventory-growth-probe] Inventory growth endpoints registered.');
    }

}

module.exports.InventoryGrowthProbe = InventoryGrowthProbe;
