/**
 *
 * Reldens - Items Steps
 *
 * The steps of the items specs, on top of the live items read by TradeSteps: the live stats of a player in the group
 * start room, a stat lowered under its base value, the stat, equipped state and stored active state expected, the
 * attack bonus of the stored percent modifier of an item (rounded like the modifiers calculator) and the configured
 * equipable item equipped, the inventory panel opened, the custom data of an item changed for the group and the group key of an item (its modifier
 * applied to the attack before the next action, the equipped flag is set before the modifiers are applied); and the
 * quantities of item keys set on the live inventory of a player (in its room or the group start room) and expected
 * on the stored inventory.
 *
 */

const { expect } = require('@playwright/test');
const { TradeSteps } = require('./trade-steps');
const { GameplayE2eStateApi } = require('./gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { ParallelSpecGroups } = require('./parallel-spec-groups');
const { SecurityApi } = require('./security-api');
const { TimeConstants } = require('./time-constants');
const { Selectors } = require('../selectors');
const { InventoryConst } = require('../../../lib/inventory/constants');
const { sc } = require('@reldens/utils');

class ItemsSteps
{

    static LOST_POINTS = 60;

    static async fetchPlayer(context, player)
    {
        return await GameplayE2eStateApi.fetchPlayer(
            context.gameConfig,
            ParallelSpecGroups.fetchGroup(context.e2eGroup).startRoomName,
            player.playerName
        );
    }

    static async lowerStat(context, player, statKey)
    {
        let base = (await ItemsSteps.fetchPlayer(context, player)).statsBase[statKey];
        await GameplayE2eStateApi.setPlayerStats(
            context.gameConfig,
            ParallelSpecGroups.fetchGroup(context.e2eGroup).startRoomName,
            player.playerName,
            {[statKey]: base - ItemsSteps.LOST_POINTS}
        );
        return base;
    }

    static async expectStat(context, player, statKey, expected, message)
    {
        await expect.poll(
            async () => (await ItemsSteps.fetchPlayer(context, player)).stats[statKey],
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(expected);
    }

    static async expectEquipped(context, player, itemId, isEquipped, message)
    {
        await expect.poll(
            async () => (await TradeSteps.fetchState(context, player)).items[itemId]?.equipped,
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(isEquipped);
    }

    static async expectStoredActive(context, player, isActive, message)
    {
        let axeKey = context.gameConfig.e2eEquipableItemId;
        await expect.poll(
            async () => (await E2eSeedAndRestoreApi.loadInventoryRows(context.gameConfig, player.playerName, axeKey)).map(
                row => Number(row.is_active)
            ),
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual([isActive]);
    }

    static async fetchAttackBonus(context, player, itemKey)
    {
        let gameConfig = context.gameConfig;
        let itemRowId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'itemsItem', {key: itemKey});
        let [modifier] = await E2eSeedAndRestoreApi.loadRows(gameConfig, 'itemsItemModifiers', {item_id: itemRowId});
        let statsBase = (await ItemsSteps.fetchPlayer(context, player)).statsBase;
        return {base: statsBase.atk, bonus: Math.round(statsBase.atk * Number(modifier.value) / 100)};
    }

    static async openInventory(page)
    {
        await page.click(Selectors.hud.inventoryOpen);
        await expect(page.locator(Selectors.inventory.ui), 'The inventory panel opens').toBeVisible();
    }

    static async changeItemCustomData(context, itemKey, customDataChanges)
    {
        let [itemRow] = await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'itemsItem', {key: itemKey});
        await E2eSeedAndRestoreApi.updateWithPreserve(context.gameConfig, context.e2eGroup, 'itemsItem', {key: itemKey}, {
            customData: sc.toJsonString(Object.assign(sc.toJson(itemRow.customData, {}), customDataChanges))
        });
        return sc.toJson(itemRow.customData, {});
    }

    static async fetchGroupKey(gameConfig, itemKey)
    {
        let [itemRow] = await E2eSeedAndRestoreApi.loadRows(gameConfig, 'itemsItem', {key: itemKey});
        let [groupRow] = await E2eSeedAndRestoreApi.loadRows(gameConfig, 'itemsGroup', {id: itemRow.group_id});
        return groupRow.key;
    }

    static async setQuantities(context, player, quantities)
    {
        let roomName = sc.get(player, 'roomName', ParallelSpecGroups.fetchGroup(context.e2eGroup).startRoomName);
        for(let itemKey of Object.keys(quantities)){
            let changed = await SecurityApi.request(context.gameConfig, 'POST', '/api/e2e/inventory/item-quantity', {
                roomName,
                playerName: player.playerName,
                itemKey,
                qty: quantities[itemKey]
            });
            expect(changed.qty, 'The '+itemKey+' quantity is set: '+changed.error).toBe(quantities[itemKey]);
        }
    }

    static async expectStoredQuantities(context, player, quantities, message)
    {
        await expect.poll(async () => {
            let storedQuantities = {};
            for(let itemKey of Object.keys(quantities)){
                storedQuantities[itemKey] = await E2eSeedAndRestoreApi.fetchInventoryQuantity(
                    context.gameConfig,
                    player.playerName,
                    itemKey
                );
            }
            return storedQuantities;
        }, {message, timeout: TimeConstants.SERVER_RESPONSE}).toEqual(quantities);
    }

    static async equipAxe(context, player)
    {
        let atk = await ItemsSteps.fetchAttackBonus(context, player, context.gameConfig.e2eEquipableItemId);
        let axeId = await TradeSteps.sendItemAction(context, player, InventoryConst.ACTIONS.EQUIP, context.gameConfig.e2eEquipableItemId);
        await ItemsSteps.expectEquipped(context, player, axeId, true, 'The axe is equipped');
        await ItemsSteps.expectStat(context, player, 'atk', atk.base + atk.bonus, 'The axe modifier is applied');
        return axeId;
    }

}

module.exports.ItemsSteps = ItemsSteps;
