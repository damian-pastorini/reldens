/**
 *
 * Reldens - Item Growth Steps
 *
 * The steps of the item growth specs: the stored growing sword data (its growth configuration and its stat modifier),
 * the stored growth of the player sword instance (its items_inventory customData), the sword seeded in the player
 * inventory for the group (with a given customData on its inventory row), the sword growth configuration changed for
 * the group before the login (the items are loaded on the join), the live inventory items read from the server
 * (InventoryGrowthProbe), the item equip toggle message, the experience added to the player class path directly (an
 * experience that is not a kill), the stored growth waited for, the live player stats, a method of an inventory item or
 * of the growth applier delayed or failed for the group and its calls read, the forest entered with the seeded sword
 * equipped (with the stored sword data and the player stats after the equip) and entered again after a page reload.
 *
 */

const { expect, test } = require('@playwright/test');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { RoomMessagesRecorder } = require('./room-messages-recorder');
const { SecurityApi } = require('./security-api');
const { GameplayE2eStateApi } = require('./gameplay-e2e-state-api');
const { Navigation } = require('./navigation');
const { Login } = require('./login');
const { TimeConstants } = require('./time-constants');
const { InventoryConst } = require('../../../lib/inventory/constants');
const { ChatConst } = require('../../../lib/chat/constants');
const { ModifierConst } = require('@reldens/modifiers');
const { sc } = require('@reldens/utils');

class ItemGrowthSteps
{

    static ITEM_KEY = 'growing_sword';
    static ITEM_CALLS_PREFIX = 'item.';
    static APPLIER_CALLS_KEY = 'itemsGrowthApplier';
    static GROWTH_TIME_OUT_MS = 30000;

    static async loadGrowingItemData(gameConfig)
    {
        let itemRow = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'itemsItem', {key: ItemGrowthSteps.ITEM_KEY})]
            .shift();
        expect(itemRow, 'The growing item must be stored').toBeTruthy();
        let modifierRow = [...await E2eSeedAndRestoreApi.loadRows(
            gameConfig,
            'itemsItemModifiers',
            {item_id: itemRow.id}
        )].shift();
        expect(modifierRow, 'The growing item must have a modifier').toBeTruthy();
        expect(Number(modifierRow.operation), 'The growing item modifier must increase its stat').toBe(
            ModifierConst.OPS.INC
        );
        return {
            itemId: itemRow.id,
            customData: sc.toJson(itemRow.customData, {}),
            growth: sc.toJson(itemRow.customData, {}).growth,
            modifierRow,
            statKey: [...modifierRow.property_key.split('/')].pop(),
            label: itemRow.label
        };
    }

    static async fetchItemGrowth(gameConfig, playerName, itemKey = ItemGrowthSteps.ITEM_KEY)
    {
        return sc.get(
            sc.toJson(
                sc.get(
                    [...await E2eSeedAndRestoreApi.loadInventoryRows(gameConfig, playerName, itemKey)].shift(),
                    'customData',
                    ''
                ),
                {}
            ),
            'growth',
            {}
        );
    }

    static async seedGrowingItem(context, inventoryCustomData = false, playerName = context.gameConfig.e2ePlayerName)
    {
        let seededRow = await E2eSeedAndRestoreApi.seedInventoryItem(
            context.gameConfig,
            context.e2eGroup,
            playerName,
            ItemGrowthSteps.ITEM_KEY,
            1
        );
        if(false !== inventoryCustomData){
            await E2eSeedAndRestoreApi.updateCreatedRow(context.gameConfig, context.e2eGroup, 'itemsInventory', seededRow.id, {
                customData: inventoryCustomData
            });
        }
        return seededRow;
    }

    static async seedItemModifiers(context, modifiers)
    {
        let itemData = await ItemGrowthSteps.loadGrowingItemData(context.gameConfig);
        for(let modifier of modifiers){
            await E2eSeedAndRestoreApi.createRow(context.gameConfig, context.e2eGroup, 'itemsItemModifiers', {
                item_id: itemData.itemId,
                key: modifier.key,
                property_key: modifier.propertyKey,
                operation: modifier.operation,
                value: modifier.value
            });
        }
    }

    static async changeItemGrowth(context, growthChanges, removedKeys = [], customDataChanges = {})
    {
        let itemData = await ItemGrowthSteps.loadGrowingItemData(context.gameConfig);
        let growth = Object.assign({}, itemData.growth, growthChanges);
        for(let removedKey of removedKeys){
            delete growth[removedKey];
        }
        await E2eSeedAndRestoreApi.updateWithPreserve(
            context.gameConfig,
            context.e2eGroup,
            'itemsItem',
            {key: ItemGrowthSteps.ITEM_KEY},
            {customData: sc.toJsonString(Object.assign({}, itemData.customData, customDataChanges, {growth}))}
        );
        return growth;
    }

    static async fetchItems(gameConfig, playerName, roomName = Login.FOREST_ROOM_NAME)
    {
        let found = await SecurityApi.request(
            gameConfig,
            'GET',
            '/api/e2e/inventory/items?roomName='+encodeURIComponent(roomName)+'&playerName='+encodeURIComponent(playerName)
        );
        expect(found.items, 'The inventory items must be read: '+found.error).toBeTruthy();
        return found.items;
    }

    static async fetchGrowingItems(gameConfig, playerName, roomName = Login.FOREST_ROOM_NAME)
    {
        return (await ItemGrowthSteps.fetchItems(gameConfig, playerName, roomName)).filter(
            item => ItemGrowthSteps.ITEM_KEY === item.key
        );
    }

    static async fetchGrowingItem(gameConfig, playerName, roomName = Login.FOREST_ROOM_NAME)
    {
        let item = [...await ItemGrowthSteps.fetchGrowingItems(gameConfig, playerName, roomName)].shift();
        expect(item, 'The growing item must be in the inventory of '+playerName).toBeTruthy();
        return item;
    }

    static async toggleEquip(page, gameConfig, item, isEquipped, roomName = Login.FOREST_ROOM_NAME)
    {
        let playerName = gameConfig.e2ePlayerName;
        await RoomMessagesRecorder.sendMessage(page, {act: InventoryConst.ACTIONS.EQUIP, 'idx': item.inventoryId});
        await expect.poll(
            async () => (await ItemGrowthSteps.fetchItems(gameConfig, playerName, roomName)).find(
                inventoryItem => item.inventoryId === inventoryItem.inventoryId
            )?.equipped,
            {message: 'The item '+item.inventoryId+' equipped must be '+isEquipped, timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(isEquipped);
    }

    static async addExperience(gameConfig, playerName, experience, roomName = Login.FOREST_ROOM_NAME)
    {
        let added = await SecurityApi.request(gameConfig, 'POST', '/api/e2e/inventory/player-experience', {
            roomName,
            playerName,
            experience
        });
        expect(added.experience, 'The experience must be added: '+added.error).toBeGreaterThanOrEqual(experience);
        return added;
    }

    static async overrideItemMethod(context, inventoryId, methodKey, behavior, playerName = context.gameConfig.e2ePlayerName)
    {
        let override = await SecurityApi.request(context.gameConfig, 'POST', '/api/e2e/inventory/item-method-override', Object.assign(
            {roomName: Login.FOREST_ROOM_NAME, group: context.e2eGroup, playerName, inventoryId, methodKey},
            behavior
        ));
        expect(override.methodKey, 'The item '+methodKey+' must change: '+override.error).toBe(methodKey);
    }

    static async overrideGrowthApplier(context, methodKey, behavior)
    {
        let override = await SecurityApi.request(context.gameConfig, 'POST', '/api/e2e/inventory/growth-applier-override', Object.assign(
            {group: context.e2eGroup, methodKey},
            behavior
        ));
        expect(override.methodKey, 'The growth applier '+methodKey+' must change: '+override.error).toBe(methodKey);
    }

    static async fetchCalls(context, callsKey, methodKey)
    {
        return await SecurityApi.request(
            context.gameConfig,
            'GET',
            '/api/e2e/live-objects/room-method-failures?callsKey='+encodeURIComponent(callsKey)
                +'&methodKey='+encodeURIComponent(methodKey)
        );
    }

    static async startGrowth(context, growthChanges = {}, removedKeys = [], isEquipped = true, inventoryCustomData = false)
    {
        test.setTimeout(
            TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, context.longRun)
            + ItemGrowthSteps.GROWTH_TIME_OUT_MS
        );
        let growth = await ItemGrowthSteps.changeItemGrowth(context, growthChanges, removedKeys);
        await ItemGrowthSteps.seedGrowingItem(context, inventoryCustomData);
        let item = await ItemGrowthSteps.enterWithGrowingItem(context, isEquipped);
        await RoomMessagesRecorder.start(context.page);
        return {
            growth,
            item,
            itemData: await ItemGrowthSteps.loadGrowingItemData(context.gameConfig),
            statsBefore: await ItemGrowthSteps.fetchPlayerStats(context.gameConfig)
        };
    }

    static async gainExperience(context, experience, expectedGrowth, roomName = Login.FOREST_ROOM_NAME)
    {
        await ItemGrowthSteps.addExperience(context.gameConfig, context.gameConfig.e2ePlayerName, experience, roomName);
        return await ItemGrowthSteps.waitForStoredGrowth(context, expectedGrowth, roomName);
    }

    static async waitForStoredGrowth(context, expectedGrowth, roomName = Login.FOREST_ROOM_NAME)
    {
        await expect.poll(
            async () => await ItemGrowthSteps.fetchItemGrowth(context.gameConfig, context.gameConfig.e2ePlayerName),
            {message: 'The item growth must be stored', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual(expectedGrowth);
        return await ItemGrowthSteps.fetchGrowingItem(context.gameConfig, context.gameConfig.e2ePlayerName, roomName);
    }

    static async giveGrowingItem(context, roomName = Login.FOREST_ROOM_NAME)
    {
        let added = await SecurityApi.request(context.gameConfig, 'POST', '/api/e2e/inventory/add-item', {
            roomName,
            playerName: context.gameConfig.e2ePlayerName,
            itemKey: ItemGrowthSteps.ITEM_KEY
        });
        expect(added.inventoryId, 'The growing item must be given: '+added.error).toBeTruthy();
        return added;
    }

    static async fetchPlayerStats(gameConfig, roomName = Login.FOREST_ROOM_NAME)
    {
        let player = await GameplayE2eStateApi.fetchPlayer(gameConfig, roomName, gameConfig.e2ePlayerName);
        expect(player.stats, 'The stats of '+gameConfig.e2ePlayerName+' must be read: '+player.error).toBeTruthy();
        return player.stats;
    }

    static async fetchLevelMessages(page)
    {
        return (await RoomMessagesRecorder.fetchMessages(page, ChatConst.CHAT_ACTION)).filter(
            message => InventoryConst.SNIPPETS.ITEM_REACHED_LEVEL === message[ChatConst.MESSAGE.KEY]
        );
    }

    static async reEnterForest(context)
    {
        await context.page.reload();
        await Login.loginRootPlayer(context.page, context.gameConfig, context.longRun);
        await Navigation.waitForRoom(
            context.page,
            Login.FOREST_ROOM_NAME,
            TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, context.longRun)
        );
        await RoomMessagesRecorder.start(context.page);
        return await ItemGrowthSteps.fetchGrowingItem(context.gameConfig, context.gameConfig.e2ePlayerName);
    }

    static async enterWithGrowingItem(context, isEquipped = true)
    {
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        let item = await ItemGrowthSteps.fetchGrowingItem(context.gameConfig, context.gameConfig.e2ePlayerName);
        if(!isEquipped){
            return item;
        }
        let modifierRow = (await ItemGrowthSteps.loadGrowingItemData(context.gameConfig)).modifierRow;
        let statKey = [...modifierRow.property_key.split('/')].pop();
        let statBefore = (await ItemGrowthSteps.fetchPlayerStats(context.gameConfig))[statKey];
        await ItemGrowthSteps.toggleEquip(context.page, context.gameConfig, item, true);
        await expect.poll(
            async () => (await ItemGrowthSteps.fetchPlayerStats(context.gameConfig))[statKey],
            {message: 'The equipped sword modifier must be applied', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(statBefore + item.modifiers.find(modifier => modifierRow.key === modifier.key).value);
        return await ItemGrowthSteps.fetchGrowingItem(context.gameConfig, context.gameConfig.e2ePlayerName);
    }

}

module.exports.ItemGrowthSteps = ItemGrowthSteps;
