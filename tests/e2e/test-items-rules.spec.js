/**
 *
 * Reldens - Test Items Rules
 *
 * Tests the rules around the item actions of the group players (TradeSteps: the inventory rows preserved, the extra
 * items seeded and the live items read from the server; ItemsSteps: the live stats, the equipped state and the custom
 * data of an item changed for the group): a room with every action disabled blocks the use and the equip, and a room
 * that only disallows the use act blocks the use while the equip works; an equipped axe is still equipped in its slot
 * after a new login with its modifier applied once; a potion with a use time out stored on the item row is used (a
 * second use inside it is still accepted, ISSUE #154) and a potion with an execution time out is used (with no delay,
 * ISSUE #154); a potion configured to
 * close the inventory on use closes the panel of the player using it (it closes the other players panels too, ISSUE
 * #155; the other clients play the use animation on their own player, ISSUE #156); and an equipment item with no
 * group is listed in the equipment panel out of the group slots.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TradeSteps } = require('./helpers/trade-steps');
const { ItemsSteps } = require('./helpers/items-steps');
const { Login } = require('./helpers/login');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { ParallelSpecGroups } = require('./helpers/parallel-spec-groups');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { InventoryConst } = require('../../lib/inventory/constants');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestItemsRules
{

    static USE_TIME_OUT_MS = 5000;
    static EXEC_TIME_OUT_MS = 4000;
    static SPEAR = 'spear';

    static async enter(context, playersCount = 1, seededItems = [])
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * (playersCount + 2), context.longRun));
        return await TradeSteps.enterPlayers(context, playersCount, seededItems);
    }

    static async changePotionTimeOut(context, timeOutColumn, timeOutMs)
    {
        await E2eSeedAndRestoreApi.updateWithPreserve(
            context.gameConfig,
            context.e2eGroup,
            'itemsItem',
            {key: context.gameConfig.e2eConsumableItemId},
            {[timeOutColumn]: timeOutMs}
        );
    }

    static async runRoomRulesTest(context)
    {
        let gameConfig = context.gameConfig;
        let roomName = ParallelSpecGroups.fetchGroup(context.e2eGroup).startRoomName;
        let potionKey = gameConfig.e2eConsumableItemId;
        let [player] = await TestItemsRules.enter(context);
        let potionQuantity = await TradeSteps.fetchQuantity(context, player, potionKey);
        await GameplayE2eStateApi.changeRoomCustomData(gameConfig, context.e2eGroup, roomName, {allActionsDisabled: true});
        let potionId = await TradeSteps.sendItemAction(context, player, InventoryConst.ACTIONS.USE, potionKey);
        let axeId = await TradeSteps.sendItemAction(context, player, InventoryConst.ACTIONS.EQUIP, gameConfig.e2eEquipableItemId);
        await player.page.waitForTimeout(TradeSteps.SETTLE_MS);
        expect(await TradeSteps.fetchQuantity(context, player, potionKey), 'No use with every action disabled').toBe(potionQuantity);
        await ItemsSteps.expectEquipped(context, player, axeId, false, 'No equip with every action disabled');
        await GameplayE2eStateApi.changeRoomCustomData(gameConfig, context.e2eGroup, roomName, {
            allActionsDisabled: false,
            disallowedActions: [InventoryConst.ACTIONS.USE]
        });
        await RoomMessagesRecorder.sendMessages(player.page, [
            {act: InventoryConst.ACTIONS.USE, 'idx': potionId},
            {act: InventoryConst.ACTIONS.EQUIP, 'idx': axeId}
        ]);
        await ItemsSteps.expectEquipped(context, player, axeId, true, 'The equip is still allowed');
        expect(await TradeSteps.fetchQuantity(context, player, potionKey), 'The disallowed use is blocked').toBe(potionQuantity);
    }

    static async runReloginTest(context)
    {
        let gameConfig = context.gameConfig;
        let [player] = await TestItemsRules.enter(context);
        let atk = await ItemsSteps.fetchAttackBonus(context, player, gameConfig.e2eEquipableItemId);
        let axeId = await ItemsSteps.equipAxe(context, player);
        await player.page.reload();
        await Login.loginRootPlayer(player.page, gameConfig, context.longRun);
        await ItemsSteps.expectEquipped(context, player, axeId, true, 'The axe stays equipped after the login');
        await ItemsSteps.expectStat(context, player, 'atk', atk.base + atk.bonus, 'The modifier is applied once after the login');
        let groupKey = await ItemsSteps.fetchGroupKey(gameConfig, gameConfig.e2eEquipableItemId);
        await expect(
            player.page.locator(Selectors.equipment.slotById(groupKey)+' .equipped-item #item-'+axeId),
            'The axe is in its group slot'
        ).toHaveCount(1);
    }

    static async runUseTimeOutTest(context)
    {
        let potionKey = context.gameConfig.e2eConsumableItemId;
        await TestItemsRules.changePotionTimeOut(context, 'useTimeOut', TestItemsRules.USE_TIME_OUT_MS);
        let [player] = await TestItemsRules.enter(context);
        let quantity = await TradeSteps.fetchQuantity(context, player, potionKey);
        await TradeSteps.sendItemAction(context, player, InventoryConst.ACTIONS.USE, potionKey);
        await TradeSteps.expectQuantity(context, player, potionKey, quantity - 1, 'The first use runs');
    }

    static async runExecTimeOutTest(context)
    {
        let potionKey = context.gameConfig.e2eConsumableItemId;
        await TestItemsRules.changePotionTimeOut(context, 'execTimeOut', TestItemsRules.EXEC_TIME_OUT_MS);
        let [player] = await TestItemsRules.enter(context);
        let quantity = await TradeSteps.fetchQuantity(context, player, potionKey);
        await TradeSteps.sendItemAction(context, player, InventoryConst.ACTIONS.USE, potionKey);
        await TradeSteps.expectQuantity(context, player, potionKey, quantity - 1, 'The item with an execution time out is used');
    }

    static async runCloseOnUseTest(context)
    {
        let potionKey = context.gameConfig.e2eConsumableItemId;
        let [potionRow] = await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'itemsItem', {key: potionKey});
        await ItemsSteps.changeItemCustomData(context, potionKey, {
            animationData: Object.assign({}, sc.toJson(potionRow.customData, {}).animationData, {closeInventoryOnUse: true})
        });
        let [actor] = await TestItemsRules.enter(context);
        await ItemsSteps.openInventory(actor.page);
        await TradeSteps.sendItemAction(context, actor, InventoryConst.ACTIONS.USE, potionKey);
        await expect(actor.page.locator(Selectors.inventory.ui), 'The own panel closes on the use').toBeHidden({
            timeout: TimeConstants.SERVER_RESPONSE
        });
    }

    static async runNoGroupEquipmentTest(context)
    {
        let spearKey = TestItemsRules.SPEAR;
        await E2eSeedAndRestoreApi.updateWithPreserve(context.gameConfig, context.e2eGroup, 'itemsItem', {key: spearKey}, {
            group_id: null
        });
        let [player] = await TestItemsRules.enter(context, 1, [{playerIndex: 0, itemKey: spearKey, qty: 1}]);
        let spearId = await TradeSteps.sendItemAction(context, player, InventoryConst.ACTIONS.EQUIP, spearKey);
        await ItemsSteps.expectEquipped(context, player, spearId, true, 'The spear with no group is equipped');
        await expect(player.page.locator(Selectors.equipment.items+' > #item-'+spearId), 'The box is in the equipment list')
            .toHaveCount(1);
        await expect(player.page.locator(Selectors.equipment.groupSlot+' #item-'+spearId), 'No group slot holds the box')
            .toHaveCount(0);
    }

    static run()
    {
        test.describe('Items Rules', () => {
            test('room rules block the item actions they disable', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemsRules.runRoomRulesTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('equipped axe is restored once in its slot after a new login', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemsRules.runReloginTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('item with a use time out is used', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemsRules.runUseTimeOutTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('item with an execution time out is used', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemsRules.runExecTimeOutTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('close on use closes the panel of the player using the item', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemsRules.runCloseOnUseTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('equipment item with no group is listed out of the group slots', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemsRules.runNoGroupEquipmentTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestItemsRules.run();
