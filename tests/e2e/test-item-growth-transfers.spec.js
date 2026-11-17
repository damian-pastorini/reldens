/**
 *
 * Reldens - Test Item Growth Transfers
 *
 * Tests a grown sword (ItemGrowthSteps: the sword seeded on the second level for the group) leaving its owner: traded
 * to the second player (the trade start, accept, add and both confirmations sent as the trade messages) it leaves the
 * first player and arrives as a new sword on the first level; the player that dies with it equipped, with the drop
 * percent at 100 and every droppable item dropped (the player inventory rows preserved for the group), keeps the sword,
 * that can not be dropped, equipped on its level after the revive while the droppable items drop; and with the sword
 * made droppable for the group (with a drop animation seeded for it, copied from the equipable item one, the drops
 * message only sends the items with an animation) and the other items of the dead player moved to the second player
 * for the group (so the sword is the single drop), the second player picks up the drop and gets the sword as a new
 * sword on the first level.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { ItemGrowthSteps } = require('./helpers/item-growth-steps');
const { ItemGrowthChecks } = require('./helpers/item-growth-checks');
const { DeathReviveSteps } = require('./helpers/death-revive-steps');
const { DeathDropSteps } = require('./helpers/death-drop-steps');
const { DeathObserverSteps } = require('./helpers/death-observer-steps');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { ActionsConst } = require('../../lib/actions/constants');
const { InventoryConst } = require('../../lib/inventory/constants');
const { ObjectsConst } = require('../../lib/objects/constants');
const { ItemsConst } = require('@reldens/items-system');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestItemGrowthTransfers
{

    static SECOND_LEVEL = 2;
    static ALL_ITEMS_DROP_QUANTITY = 50;
    static NEW_ITEM_GROWTH = [[ItemsConst.GROWTH.DEFAULT_LEVEL, 0]];

    static async preserveInventory(context, playerName)
    {
        let ownerFilter = {owner_id: await E2eSeedAndRestoreApi.fetchRowId(context.gameConfig, 'players', {name: playerName})};
        await E2eSeedAndRestoreApi.preserveRows(context.gameConfig, context.e2eGroup, 'itemsInventory', ownerFilter);
        return ownerFilter;
    }

    static async seedDropAnimation(context)
    {
        let gameConfig = context.gameConfig;
        let storedAnimation = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'dropsAnimations', {
            item_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'itemsItem', {key: gameConfig.e2eEquipableItemId})
        })].shift();
        expect(storedAnimation, 'The equipable item drop animation must be stored').toBeTruthy();
        await E2eSeedAndRestoreApi.createRow(gameConfig, context.e2eGroup, 'dropsAnimations', {
            item_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'itemsItem', {key: ItemGrowthSteps.ITEM_KEY}),
            asset_type: storedAnimation.asset_type,
            asset_key: storedAnimation.asset_key,
            file: storedAnimation.file,
            extra_params: storedAnimation.extra_params
        });
    }

    static async seedGrownSword(context, isDroppable)
    {
        let itemGrowth = await ItemGrowthSteps.changeItemGrowth(context, {}, [], isDroppable ? {canBeDropped: true} : {});
        if(isDroppable){
            await TestItemGrowthTransfers.seedDropAnimation(context);
        }
        let growth = {
            level: TestItemGrowthTransfers.SECOND_LEVEL,
            experience: ItemGrowthChecks.levelThreshold(itemGrowth, TestItemGrowthTransfers.SECOND_LEVEL)
        };
        await ItemGrowthSteps.seedGrowingItem(context, sc.toJsonString({growth}));
        return growth;
    }

    static async prepareDeathWithGrownSword(context, isDroppable, otherItemsOwnerFilter = false)
    {
        await DeathReviveSteps.prepareDeath(context, {
            [ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: false,
            [DeathReviveSteps.DROP_PERCENT_PATH]: DeathDropSteps.FULL_DROP_PERCENT,
            [DeathDropSteps.DROP_QUANTITY_PATH]: TestItemGrowthTransfers.ALL_ITEMS_DROP_QUANTITY
        });
        let ownerFilter = await TestItemGrowthTransfers.preserveInventory(context, context.gameConfig.e2ePlayerName);
        if(otherItemsOwnerFilter){
            await E2eSeedAndRestoreApi.updateWithPreserve(
                context.gameConfig,
                context.e2eGroup,
                'itemsInventory',
                ownerFilter,
                otherItemsOwnerFilter
            );
        }
        return await TestItemGrowthTransfers.seedGrownSword(context, isDroppable);
    }

    static async killWithEquippedSword(context)
    {
        let placement = await DeathReviveSteps.enterForest(context, true);
        await ItemGrowthSteps.toggleEquip(
            context.page,
            context.gameConfig,
            await ItemGrowthSteps.fetchGrowingItem(context.gameConfig, context.gameConfig.e2ePlayerName),
            true
        );
        await DeathDropSteps.killOnPlayerTile(context, placement, 'The player dies with its grown sword equipped');
    }

    static async expectNewSword(gameConfig)
    {
        await expect.poll(
            async () => (await ItemGrowthSteps.fetchGrowingItems(gameConfig, gameConfig.e2ePlayerName)).map(
                item => [item.growthLevel, item.growthExperience]
            ),
            {message: 'The new owner gets a new sword on the first level', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual(TestItemGrowthTransfers.NEW_ITEM_GROWTH);
    }

    static async sendTradeAction(page, partnerSessionId, tradeData)
    {
        await RoomMessagesRecorder.sendMessage(page, Object.assign(
            {act: InventoryConst.ACTIONS.TRADE_ACTION, id: partnerSessionId},
            tradeData
        ));
    }

    static async waitForTradeShows(page, count)
    {
        await expect.poll(
            async () => (await RoomMessagesRecorder.fetchMessages(page, InventoryConst.ACTIONS.TRADE_SHOW)).length,
            {message: 'The trade update must arrive', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBeGreaterThanOrEqual(count);
    }

    static async enterSecondPlayer(context, secondGameConfig)
    {
        test.setTimeout(
            test.info().timeout
            + TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, context.longRun)
        );
        await Login.loginAndEnterForest(context.secondPage, secondGameConfig, context.longRun);
        await RoomMessagesRecorder.start(context.secondPage);
    }

    static async runTradedItemTest(context)
    {
        test.setTimeout(
            TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, context.longRun)
            + ItemGrowthSteps.GROWTH_TIME_OUT_MS
        );
        let secondGameConfig = Login.fetchSecondPlayerConfig(context.gameConfig);
        await TestItemGrowthTransfers.preserveInventory(context, secondGameConfig.e2ePlayerName);
        await TestItemGrowthTransfers.seedGrownSword(context, false);
        let grownItem = await ItemGrowthSteps.enterWithGrowingItem(context, false);
        await TestItemGrowthTransfers.enterSecondPlayer(context, secondGameConfig);
        let starterSessionId = await DeathObserverSteps.fetchSessionId(context.page);
        let partnerSessionId = await DeathObserverSteps.fetchSessionId(context.secondPage);
        await RoomMessagesRecorder.sendMessage(context.page, {act: InventoryConst.ACTIONS.TRADE_START, id: partnerSessionId});
        await RoomMessagesRecorder.waitForMessage(context.secondPage, InventoryConst.ACTIONS.TRADE_START, TimeConstants.SERVER_RESPONSE);
        await RoomMessagesRecorder.sendMessage(context.secondPage, {
            act: InventoryConst.ACTIONS.TRADE_ACCEPTED,
            value: '1',
            id: starterSessionId
        });
        await TestItemGrowthTransfers.waitForTradeShows(context.secondPage, 1);
        await TestItemGrowthTransfers.sendTradeAction(context.page, partnerSessionId, {
            sub: ObjectsConst.TRADE_ACTIONS.ADD,
            itemId: grownItem.inventoryId,
            qty: 1
        });
        await TestItemGrowthTransfers.waitForTradeShows(context.secondPage, 2);
        await TestItemGrowthTransfers.sendTradeAction(context.page, partnerSessionId, {sub: ObjectsConst.TRADE_ACTIONS.CONFIRM});
        await TestItemGrowthTransfers.waitForTradeShows(context.secondPage, 3);
        await TestItemGrowthTransfers.sendTradeAction(context.secondPage, starterSessionId, {sub: ObjectsConst.TRADE_ACTIONS.CONFIRM});
        await TestItemGrowthTransfers.expectNewSword(secondGameConfig);
        expect(
            await ItemGrowthSteps.fetchGrowingItems(context.gameConfig, context.gameConfig.e2ePlayerName),
            'The traded sword leaves the first player'
        ).toEqual([]);
    }

    static async runDeathKeepsSwordTest(context)
    {
        let growth = await TestItemGrowthTransfers.prepareDeathWithGrownSword(context, false);
        await TestItemGrowthTransfers.killWithEquippedSword(context);
        let gameConfig = context.gameConfig;
        await expect.poll(
            async () => await E2eSeedAndRestoreApi.loadInventoryRows(gameConfig, gameConfig.e2ePlayerName, gameConfig.e2eEquipableItemId),
            {message: 'The droppable items drop', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual([]);
        await DeathReviveSteps.expectAliveInForest(context);
        let sword = await ItemGrowthSteps.fetchGrowingItem(gameConfig, gameConfig.e2ePlayerName);
        expect(
            [sword.equipped, sword.growthLevel, sword.growthExperience],
            'The sword is kept equipped on its level after the revive'
        ).toEqual([true, growth.level, growth.experience]);
        expect(await ItemGrowthSteps.fetchItemGrowth(gameConfig, gameConfig.e2ePlayerName), 'The stored growth is kept')
            .toEqual(growth);
    }

    static async runDroppedItemPickedUpTest(context)
    {
        let secondGameConfig = Login.fetchSecondPlayerConfig(context.gameConfig);
        let secondOwnerFilter = await TestItemGrowthTransfers.preserveInventory(context, secondGameConfig.e2ePlayerName);
        await TestItemGrowthTransfers.prepareDeathWithGrownSword(context, true, secondOwnerFilter);
        await TestItemGrowthTransfers.enterSecondPlayer(context, secondGameConfig);
        await TestItemGrowthTransfers.killWithEquippedSword(context);
        await expect.poll(
            async () => await ItemGrowthSteps.fetchItemGrowth(context.gameConfig, context.gameConfig.e2ePlayerName),
            {message: 'The droppable grown sword drops', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual({});
        let dropsIds = (await DeathDropSteps.fetchDrops(context.secondPage)).flatMap(drops => Object.keys(drops));
        expect(dropsIds, 'The second player receives the single sword drop').toHaveLength(1);
        let dropId = [...dropsIds].shift();
        let placed = await RoomObjectsApi.placePlayerNextToObject(
            context.secondPage,
            secondGameConfig,
            Login.FOREST_ROOM_NAME,
            dropId,
            TimeConstants.SERVER_RESPONSE
        );
        expect(placed.reached, 'The second player must be placed next to the drop').toBe(true);
        await RoomMessagesRecorder.sendMessage(context.secondPage, {
            act: ObjectsConst.OBJECT_INTERACTION,
            type: ObjectsConst.DROPS.PICK_UP_ACT,
            id: dropId
        });
        await TestItemGrowthTransfers.expectNewSword(secondGameConfig);
    }

    static run()
    {
        test.describe('Item Growth Transfers', () => {
            test('grown sword traded to another player arrives as a new sword on the first level', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthTransfers.runTradedItemTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('death with the grown sword equipped keeps it on its level after the revive', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthTransfers.runDeathKeepsSwordTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('droppable grown sword picked up by another player arrives on the first level', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthTransfers.runDroppedItemPickedUpTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestItemGrowthTransfers.run();
