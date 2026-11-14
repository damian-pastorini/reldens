/**
 *
 * Reldens - Test Items Actions
 *
 * Tests the inventory actions a client sends (TradeSteps: the inventory rows of the group players preserved, the extra
 * items seeded and the live items read from the server; ItemsSteps: the live player stats read from the server): an
 * equip adds the exact stored modifier and stores the item active, an unequip reverts it and stores it inactive; a
 * consumable heals by its value, is clamped at the max life, uses exactly one unit stored, and the last unit removes the
 * item, its row and its client box; unknown or wrong item actions change nothing; a stack trashed twice is removed once and stays gone after a new
 * login; two uses in the same tick use two units and heal twice; a second item of the same group replaces the equipped
 * one, items of two groups stay equipped; a trashed equipped item is removed live and stored; coins received while
 * owning coins merge; a used non stackable fish removes only that instance; and the actions of a player never change
 * the items, stats or client item boxes of another player.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TradeSteps } = require('./helpers/trade-steps');
const { ItemsSteps } = require('./helpers/items-steps');
const { Login } = require('./helpers/login');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { ParallelSpecGroups } = require('./helpers/parallel-spec-groups');
const { SecurityApi } = require('./helpers/security-api');
const { Selectors } = require('./selectors');
const { TimeConstants } = require('./helpers/time-constants');
const { InventoryConst } = require('../../lib/inventory/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestItemsActions
{

    static ITEM_KEYS = {
        magicPotion: 'magic_potion_20',
        branch: 'branch',
        spear: 'spear',
        robe: 'skin_warlock_robe',
        coins: 'coins',
        fish: 'fish'
    };
    static POTION_VALUE = 20;
    static MISSING_INDEX = 'e2e-missing-item';
    static UNKNOWN_ACT = InventoryConst.ACTIONS.PREFIX+'E2e';

    static async enter(context, playersCount = 1, seededItems = [])
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * (playersCount + 2), context.longRun));
        return await TradeSteps.enterPlayers(context, playersCount, seededItems);
    }

    static async runEquipTest(context)
    {
        let [player] = await TestItemsActions.enter(context);
        let atk = await ItemsSteps.fetchAttackBonus(context, player, context.gameConfig.e2eEquipableItemId);
        let axeId = await ItemsSteps.equipAxe(context, player);
        await ItemsSteps.expectStat(context, player, 'atk', atk.base + atk.bonus, 'The equip adds the stored modifier');
        await ItemsSteps.expectStoredActive(context, player, 1, 'The equipped axe is stored active');
        await RoomMessagesRecorder.sendMessage(player.page, {act: InventoryConst.ACTIONS.EQUIP, 'idx': axeId});
        await ItemsSteps.expectStat(context, player, 'atk', atk.base, 'The unequip reverts the modifier');
        await ItemsSteps.expectStoredActive(context, player, 0, 'The unequipped axe is stored inactive');
    }

    static async runConsumableTest(context)
    {
        let [player] = await TestItemsActions.enter(context);
        let potionKey = context.gameConfig.e2eConsumableItemId;
        let ownedQuantity = await TradeSteps.fetchQuantity(context, player, potionKey);
        let baseLife = await ItemsSteps.lowerStat(context, player, 'hp');
        await TradeSteps.sendItemAction(context, player, InventoryConst.ACTIONS.USE, potionKey);
        let healedLife = baseLife - ItemsSteps.LOST_POINTS + TestItemsActions.POTION_VALUE;
        await ItemsSteps.expectStat(context, player, 'hp', healedLife, 'The potion heals its value');
        await TradeSteps.expectQuantity(context, player, potionKey, ownedQuantity - 1, 'Exactly one potion is used');
        await TradeSteps.expectStoredQuantity(context, player, potionKey, ownedQuantity - 1, 'The used potion is stored');
        for(let potionUse of [2, 3]){
            await TradeSteps.sendItemAction(context, player, InventoryConst.ACTIONS.USE, potionKey);
            await TradeSteps.expectQuantity(context, player, potionKey, ownedQuantity - potionUse, 'The potion '+potionUse+' is used');
        }
        await ItemsSteps.expectStat(context, player, 'hp', baseLife, 'The heal is clamped at the max life');
        await player.page.reload();
        await Login.loginRootPlayer(player.page, context.gameConfig, context.longRun);
        await TradeSteps.expectQuantity(context, player, potionKey, ownedQuantity - 3, 'The used potions stay used after a login');
    }

    static async runLastUnitTest(context)
    {
        let magicPotionKey = TestItemsActions.ITEM_KEYS.magicPotion;
        let [player] = await TestItemsActions.enter(context, 1, [{playerIndex: 0, itemKey: magicPotionKey, qty: 1}]);
        let baseMagic = await ItemsSteps.lowerStat(context, player, 'mp');
        let magicPotionImage = player.page.locator(Selectors.inventory.itemImage(magicPotionKey));
        await expect(magicPotionImage, 'The magic potion box is shown').toHaveCount(1);
        await TradeSteps.sendItemAction(context, player, InventoryConst.ACTIONS.USE, magicPotionKey);
        let restoredMagic = baseMagic - ItemsSteps.LOST_POINTS + TestItemsActions.POTION_VALUE;
        await ItemsSteps.expectStat(context, player, 'mp', restoredMagic, 'The magic potion adds its value');
        await TradeSteps.expectQuantity(context, player, magicPotionKey, 0, 'The last unit removes the item');
        await TradeSteps.expectStoredQuantity(context, player, magicPotionKey, 0, 'The last unit row is removed');
        await expect(magicPotionImage, 'The last unit removes the item box').toHaveCount(0);
    }

    static async runRejectedActionsTest(context)
    {
        let [player] = await TestItemsActions.enter(context, 1, [{playerIndex: 0, itemKey: TestItemsActions.ITEM_KEYS.branch, qty: 1}]);
        let itemsBefore = (await TradeSteps.fetchState(context, player)).items;
        let statsBefore = (await ItemsSteps.fetchPlayer(context, player)).stats;
        let branchId = await TradeSteps.fetchItemId(context, player, TestItemsActions.ITEM_KEYS.branch);
        let potionId = await TradeSteps.fetchItemId(context, player, context.gameConfig.e2eConsumableItemId);
        await RoomMessagesRecorder.sendMessages(player.page, [
            {act: InventoryConst.ACTIONS.USE, 'idx': TestItemsActions.MISSING_INDEX},
            {act: InventoryConst.ACTIONS.EQUIP, 'idx': TestItemsActions.MISSING_INDEX},
            {act: InventoryConst.ACTIONS.REMOVE, 'idx': TestItemsActions.MISSING_INDEX},
            {act: InventoryConst.ACTIONS.USE, 'idx': branchId},
            {act: InventoryConst.ACTIONS.EQUIP, 'idx': potionId},
            {act: TestItemsActions.UNKNOWN_ACT, 'idx': potionId}
        ]);
        await player.page.waitForTimeout(TradeSteps.SETTLE_MS);
        expect((await TradeSteps.fetchState(context, player)).items, 'No item changes').toEqual(itemsBefore);
        expect((await ItemsSteps.fetchPlayer(context, player)).stats, 'No stat changes').toEqual(statsBefore);
    }

    static async runTrashTest(context)
    {
        let [player] = await TestItemsActions.enter(context);
        let potionKey = context.gameConfig.e2eConsumableItemId;
        let potionId = await TradeSteps.fetchItemId(context, player, potionKey);
        let trash = {act: InventoryConst.ACTIONS.REMOVE, 'idx': potionId};
        await RoomMessagesRecorder.sendMessages(player.page, [trash, trash]);
        await TradeSteps.expectQuantity(context, player, potionKey, 0, 'The whole stack is trashed');
        await TradeSteps.expectStoredQuantity(context, player, potionKey, 0, 'The trashed stack row is removed');
        await player.page.reload();
        await Login.loginRootPlayer(player.page, context.gameConfig, context.longRun);
        await TradeSteps.expectQuantity(context, player, potionKey, 0, 'The trashed stack stays gone after the login');
    }

    static async runConcurrentUsesTest(context)
    {
        let [player] = await TestItemsActions.enter(context);
        let potionKey = context.gameConfig.e2eConsumableItemId;
        let ownedQuantity = await TradeSteps.fetchQuantity(context, player, potionKey);
        let baseLife = await ItemsSteps.lowerStat(context, player, 'hp');
        let use = {act: InventoryConst.ACTIONS.USE, 'idx': await TradeSteps.fetchItemId(context, player, potionKey)};
        await RoomMessagesRecorder.sendMessages(player.page, [use, use]);
        await TradeSteps.expectQuantity(context, player, potionKey, ownedQuantity - 2, 'Two potions are used');
        let healedLife = baseLife - ItemsSteps.LOST_POINTS + 2 * TestItemsActions.POTION_VALUE;
        await ItemsSteps.expectStat(context, player, 'hp', healedLife, 'Two heals are applied');
    }

    static async runSameGroupTest(context)
    {
        let spearKey = TestItemsActions.ITEM_KEYS.spear;
        let [player] = await TestItemsActions.enter(context, 1, [{playerIndex: 0, itemKey: spearKey, qty: 1}]);
        let atk = await ItemsSteps.fetchAttackBonus(context, player, spearKey);
        let spearId = await TradeSteps.sendItemAction(context, player, InventoryConst.ACTIONS.EQUIP, spearKey);
        await ItemsSteps.expectEquipped(context, player, spearId, true, 'The spear is equipped');
        await ItemsSteps.expectStat(context, player, 'atk', atk.base + atk.bonus, 'The spear modifier is applied');
        let equipSpear = {act: InventoryConst.ACTIONS.EQUIP, 'idx': spearId};
        await RoomMessagesRecorder.sendMessage(player.page, equipSpear);
        await ItemsSteps.expectEquipped(context, player, spearId, false, 'The spear is unequipped');
        await ItemsSteps.expectStat(context, player, 'atk', atk.base, 'The spear modifier is reverted');
        let axeId = await ItemsSteps.equipAxe(context, player);
        await RoomMessagesRecorder.sendMessage(player.page, equipSpear);
        await ItemsSteps.expectEquipped(context, player, axeId, false, 'The spear replaces the axe');
        await ItemsSteps.expectStat(context, player, 'atk', atk.base + atk.bonus, 'Only the spear modifier is applied');
    }

    static async runTwoGroupsTest(context)
    {
        let robeKey = TestItemsActions.ITEM_KEYS.robe;
        let [player] = await TestItemsActions.enter(context, 1, [{playerIndex: 0, itemKey: robeKey, qty: 1}]);
        let atk = await ItemsSteps.fetchAttackBonus(context, player, context.gameConfig.e2eEquipableItemId);
        let axeId = await ItemsSteps.equipAxe(context, player);
        let robeId = await TradeSteps.sendItemAction(context, player, InventoryConst.ACTIONS.EQUIP, robeKey);
        await ItemsSteps.expectEquipped(context, player, robeId, true, 'The robe is equipped');
        await ItemsSteps.expectEquipped(context, player, axeId, true, 'The axe stays equipped');
        await ItemsSteps.expectStat(context, player, 'atk', atk.base + atk.bonus, 'The axe modifier stays');
    }

    static async runTrashEquippedTest(context)
    {
        let [player] = await TestItemsActions.enter(context);
        let atk = await ItemsSteps.fetchAttackBonus(context, player, context.gameConfig.e2eEquipableItemId);
        let axeId = await ItemsSteps.equipAxe(context, player);
        await ItemsSteps.expectStat(context, player, 'atk', atk.base + atk.bonus, 'The axe modifier is applied');
        await RoomMessagesRecorder.sendMessage(player.page, {act: InventoryConst.ACTIONS.REMOVE, 'idx': axeId});
        await TradeSteps.expectQuantity(context, player, context.gameConfig.e2eEquipableItemId, 0, 'The axe is trashed');
        await TradeSteps.expectStoredQuantity(context, player, context.gameConfig.e2eEquipableItemId, 0, 'The trashed axe row is removed');
        await ItemsSteps.expectStat(context, player, 'atk', atk.base, 'The trashed axe modifier is reverted');
    }

    static async runCoinsTest(context)
    {
        let [player] = await TestItemsActions.enter(context);
        let coinsKey = TestItemsActions.ITEM_KEYS.coins;
        let roomName = ParallelSpecGroups.fetchGroup(context.e2eGroup).startRoomName;
        for(let addedCoin of [1, 2]){
            let added = await SecurityApi.request(context.gameConfig, 'POST', '/api/e2e/inventory/add-item', {
                roomName,
                playerName: player.playerName,
                itemKey: coinsKey
            });
            expect(added.inventoryId, 'The coin '+addedCoin+' is added').toBeTruthy();
        }
        let items = (await TradeSteps.fetchState(context, player)).items;
        expect(Object.keys(items).filter(itemId => coinsKey === items[itemId].key).map(itemId => items[itemId].qty), 'One coins stack')
            .toEqual([2]);
    }

    static async runFishTest(context)
    {
        let fishKey = TestItemsActions.ITEM_KEYS.fish;
        let [player] = await TestItemsActions.enter(context, 1, [
            {playerIndex: 0, itemKey: fishKey, qty: 1},
            {playerIndex: 0, itemKey: fishKey, qty: 1}
        ]);
        let items = (await TradeSteps.fetchState(context, player)).items;
        let fishIds = Object.keys(items).filter(itemId => fishKey === items[itemId].key);
        expect(fishIds.length, 'Two fish instances').toBe(2);
        await ItemsSteps.lowerStat(context, player, 'hp');
        await RoomMessagesRecorder.sendMessage(player.page, {act: InventoryConst.ACTIONS.USE, 'idx': fishIds[0]});
        await expect.poll(async () => Object.keys((await TradeSteps.fetchState(context, player)).items), {
            message: 'The used fish is removed',
            timeout: TimeConstants.SERVER_RESPONSE
        }).not.toContain(fishIds[0]);
        expect(Object.keys((await TradeSteps.fetchState(context, player)).items), 'The other fish stays').toContain(fishIds[1]);
        await TradeSteps.expectStoredQuantity(context, player, fishKey, 1, 'One fish row stays');
    }

    static async runOtherPlayerTest(context)
    {
        let [actor, other] = await TestItemsActions.enter(context, 2);
        let otherItems = (await TradeSteps.fetchState(context, other)).items;
        let otherStats = (await ItemsSteps.fetchPlayer(context, other)).stats;
        let otherBoxes = await TestItemsActions.fetchItemBoxes(other.page);
        expect(otherBoxes.length, 'The other player client shows its item boxes').toBeGreaterThan(0);
        let axeKey = context.gameConfig.e2eEquipableItemId;
        await TradeSteps.sendItemAction(context, actor, InventoryConst.ACTIONS.USE, context.gameConfig.e2eConsumableItemId);
        let axeId = await ItemsSteps.equipAxe(context, actor);
        await RoomMessagesRecorder.sendMessage(actor.page, {act: InventoryConst.ACTIONS.EQUIP, 'idx': axeId});
        await ItemsSteps.expectEquipped(context, actor, axeId, false, 'The actor unequips the axe');
        await RoomMessagesRecorder.sendMessage(actor.page, {act: InventoryConst.ACTIONS.REMOVE, 'idx': axeId});
        await TradeSteps.expectQuantity(context, actor, axeKey, 0, 'The actor trashes the axe');
        expect((await TradeSteps.fetchState(context, other)).items, 'The other player items do not change').toEqual(otherItems);
        expect((await ItemsSteps.fetchPlayer(context, other)).stats, 'The other player stats do not change').toEqual(otherStats);
        expect(await TestItemsActions.fetchItemBoxes(other.page), 'The other player item boxes do not change').toEqual(otherBoxes);
    }

    static async fetchItemBoxes(page)
    {
        return await page.locator(Selectors.inventory.items+' .item-box, '+Selectors.equipment.items+' .item-box').evaluateAll(
            boxes => boxes.map(box => [
                box.closest('#inventory-items, #equipment-items').id,
                box.id,
                box.querySelector('[id^="item-qty-"]')?.textContent || ''
            ])
        );
    }

    static run()
    {
        test.describe('Items Actions', () => {
            test('equip adds the stored modifier and unequip reverts it, both stored', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemsActions.runEquipTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('consumable heals, uses one unit stored and kept after a login, and is clamped at the max', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemsActions.runConsumableTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('last unit used removes the item', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemsActions.runLastUnitTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('unknown and wrong item actions change nothing', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemsActions.runRejectedActionsTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('trashed stack is removed once and stays gone after a login', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemsActions.runTrashTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('two uses in one tick use two units and heal twice', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemsActions.runConcurrentUsesTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('item of the same group replaces the equipped one', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemsActions.runSameGroupTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('items of two groups stay equipped', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemsActions.runTwoGroupsTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('trashed equipped item is removed live and stored', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemsActions.runTrashEquippedTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('coins received while owning coins merge', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemsActions.runCoinsTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('used fish removes only that instance', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemsActions.runFishTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('actions of a player never change another player', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemsActions.runOtherPlayerTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestItemsActions.run();
