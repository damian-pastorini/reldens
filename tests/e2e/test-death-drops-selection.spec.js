/**
 *
 * Reldens - Test Death Drops Selection
 *
 * Tests which player items drop on its death (DeathDropSteps: the drop config for the group, restored by the group
 * reset, the player killed by the forest enemy on its own tile and its drops broadcasts recorded): with the drop percent
 * at 0 nothing drops and every item row is kept; with a drop quantity above the droppable items (the axe, the potions
 * stack and eight seeded branches) every droppable item drops and the non droppable ticket is kept; with a drop quantity
 * of 2 and three droppable items (the axe and two seeded branches) exactly two drop; an item with its own drop percent
 * at 0 is never dropped and stays equipped with its modifier; with two equipped droppable items (the axe and a robe made
 * droppable) and a drop quantity of 1, one of them drops and the other one stays equipped; the equipped skin robe (not
 * droppable) is never dropped, stays equipped and keeps the skin avatar after the revive; a dropped item with no
 * drops_animations row creates the room drop object (DropsProbe) but is never sent to
 * the clients; and a second player picks up the drop of the dead player: the item is stored in its inventory, the drop
 * object leaves the room and both clients receive the drop removal.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { DeathReviveSteps } = require('./helpers/death-revive-steps');
const { DeathDropSteps } = require('./helpers/death-drop-steps');
const { ItemsSteps } = require('./helpers/items-steps');
const { SkinSteps } = require('./helpers/skin-steps');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Login } = require('./helpers/login');
const { ObjectsConst } = require('../../lib/objects/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestDeathDropsSelection
{

    static BRANCH = 'branch';
    static SEEDED_BRANCHES = 8;
    static TICKET = 'skin_ad_ticket';
    static ROBE = 'skin_warlock_robe';
    static QUIET_MS = 1500;

    static async expectDropsReceived(page)
    {
        await expect.poll(
            async () => (await DeathDropSteps.fetchDrops(page)).length,
            {message: 'The drops broadcast arrives', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBeGreaterThan(0);
        return (await DeathDropSteps.fetchDrops(page)).flatMap(drops => Object.keys(drops));
    }

    static async seedBranches(context, count)
    {
        let gameConfig = context.gameConfig;
        await Promise.all(Array.from({length: count}, () => E2eSeedAndRestoreApi.seedInventoryItem(
            gameConfig,
            context.e2eGroup,
            gameConfig.e2ePlayerName,
            TestDeathDropsSelection.BRANCH,
            1
        )));
    }

    static async runNoDropPercentTest(context)
    {
        await DeathDropSteps.prepareDrops(context, {
            [DeathReviveSteps.DROP_PERCENT_PATH]: DeathReviveSteps.NO_DROP_PERCENT,
            [DeathDropSteps.DROP_QUANTITY_PATH]: 1
        });
        let itemKeys = [context.gameConfig.e2eEquipableItemId, context.gameConfig.e2eConsumableItemId];
        let rowsBefore = await DeathDropSteps.fetchInventoryRows(context, itemKeys);
        let placement = await DeathDropSteps.enterForDrops(context);
        await DeathDropSteps.killOnPlayerTile(context, placement, 'The player dies with the drop percent at 0');
        await context.page.waitForTimeout(TestDeathDropsSelection.QUIET_MS);
        expect(await DeathDropSteps.fetchDrops(context.page), 'No drop').toEqual([]);
        expect(await DeathDropSteps.fetchInventoryRows(context, itemKeys), 'Every item is kept').toEqual(rowsBefore);
    }

    static async runAboveDroppableQuantityTest(context)
    {
        let gameConfig = context.gameConfig;
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, context.e2eGroup, 'itemsInventory', {
            owner_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: gameConfig.e2ePlayerName})
        });
        await TestDeathDropsSelection.seedBranches(context, TestDeathDropsSelection.SEEDED_BRANCHES);
        await E2eSeedAndRestoreApi.seedInventoryItem(gameConfig, context.e2eGroup, gameConfig.e2ePlayerName, TestDeathDropsSelection.TICKET, 1);
        let droppableKeys = [gameConfig.e2eEquipableItemId, gameConfig.e2eConsumableItemId, TestDeathDropsSelection.BRANCH];
        let droppableRows = await DeathDropSteps.fetchInventoryRows(context, droppableKeys);
        await DeathDropSteps.prepareDrops(context, {[DeathDropSteps.DROP_QUANTITY_PATH]: droppableRows.length + 2});
        let placement = await DeathDropSteps.enterForDrops(context);
        await DeathDropSteps.killOnPlayerTile(context, placement, 'The player dies with more drops allowed than droppable items');
        let dropsIds = await TestDeathDropsSelection.expectDropsReceived(context.page);
        expect(dropsIds, 'Every droppable item drops').toHaveLength(droppableRows.length);
        expect(await DeathDropSteps.fetchInventoryRows(context, droppableKeys), 'Every droppable row is removed').toEqual([]);
        expect(await DeathDropSteps.fetchInventoryRows(context, [TestDeathDropsSelection.TICKET]), 'The ticket is kept')
            .toHaveLength(1);
    }

    static async runPartialDropQuantityTest(context)
    {
        let gameConfig = context.gameConfig;
        await DeathDropSteps.prepareDrops(context, {[DeathDropSteps.DROP_QUANTITY_PATH]: 2});
        await DeathDropSteps.carryOnlyTheEquippedAxe(context);
        await TestDeathDropsSelection.seedBranches(context, 2);
        let droppableKeys = [gameConfig.e2eEquipableItemId, TestDeathDropsSelection.BRANCH];
        expect(await DeathDropSteps.fetchInventoryRows(context, droppableKeys), 'Three droppable rows').toHaveLength(3);
        let placement = await DeathDropSteps.enterForDrops(context);
        await DeathDropSteps.killOnPlayerTile(context, placement, 'The player dies with two drops allowed for three items');
        expect(await TestDeathDropsSelection.expectDropsReceived(context.page), 'Exactly two items drop').toHaveLength(2);
        expect(await DeathDropSteps.fetchInventoryRows(context, droppableKeys), 'Exactly two rows are removed').toHaveLength(1);
    }

    static async runOwnDropPercentTest(context)
    {
        let gameConfig = context.gameConfig;
        await DeathDropSteps.prepareDrops(context, {[DeathDropSteps.DROP_QUANTITY_PATH]: 1});
        let axeFilters = await DeathDropSteps.carryOnlyTheEquippedAxe(context);
        await ItemsSteps.changeItemCustomData(context, gameConfig.e2eEquipableItemId, {dropPercent: 0});
        let placement = await DeathDropSteps.enterForDrops(context);
        let attackWithAxe = (await DeathReviveSteps.fetchPlayer(context, Login.FOREST_ROOM_NAME)).stats.atk;
        await DeathDropSteps.killOnPlayerTile(context, placement, 'The player dies carrying an axe that never drops');
        await context.page.waitForTimeout(TestDeathDropsSelection.QUIET_MS);
        expect(await DeathDropSteps.fetchDrops(context.page), 'No drop').toEqual([]);
        expect(
            (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'itemsInventory', axeFilters)).map(row => Number(row.is_active)),
            'The axe is kept equipped'
        ).toEqual([1]);
        expect((await DeathReviveSteps.fetchPlayer(context, Login.FOREST_ROOM_NAME)).stats.atk, 'The axe modifier stays')
            .toBe(attackWithAxe);
    }

    static async runNotSelectedEquippedTest(context)
    {
        let equipmentKeys = [context.gameConfig.e2eEquipableItemId, TestDeathDropsSelection.ROBE];
        await DeathDropSteps.prepareDrops(context, {[DeathDropSteps.DROP_QUANTITY_PATH]: 1});
        await DeathDropSteps.carryOnlyTheEquippedAxe(context);
        await ItemsSteps.changeItemCustomData(context, TestDeathDropsSelection.ROBE, {canBeDropped: true});
        await DeathDropSteps.seedEquippedItem(context, TestDeathDropsSelection.ROBE);
        let placement = await DeathDropSteps.enterForDrops(context);
        await DeathDropSteps.killOnPlayerTile(context, placement, 'The player dies with two droppable items equipped');
        await expect.poll(
            async () => (await DeathDropSteps.fetchInventoryRows(context, equipmentKeys)).length,
            {message: 'One of the equipped items drops', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(1);
        expect(
            (await DeathDropSteps.fetchInventoryRows(context, equipmentKeys)).map(row => Number(row.is_active)),
            'The equipped item not dropped stays equipped'
        ).toEqual([1]);
    }

    static async runEquippedSkinTest(context)
    {
        let robeKey = TestDeathDropsSelection.ROBE;
        let skinData = await SkinSteps.loadSkinData(context.gameConfig);
        expect(skinData.rewardItemKey, 'The robe is the skin item').toBe(robeKey);
        await DeathDropSteps.prepareDrops(context, {[DeathDropSteps.DROP_QUANTITY_PATH]: 1});
        await DeathDropSteps.carryOnlyTheEquippedAxe(context);
        await DeathDropSteps.seedEquippedItem(context, robeKey);
        let placement = await DeathDropSteps.enterForDrops(context);
        expect((await DeathReviveSteps.fetchPlayer(context, Login.FOREST_ROOM_NAME)).avatarKey, 'The skin is the avatar')
            .toBe(skinData.skinKey);
        await DeathDropSteps.killOnPlayerTile(context, placement, 'The player dies with the skin robe equipped');
        await expect.poll(
            async () => (await DeathDropSteps.fetchInventoryRows(context, [context.gameConfig.e2eEquipableItemId])).length,
            {message: 'The droppable axe drops', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(0);
        expect(
            (await DeathDropSteps.fetchInventoryRows(context, [robeKey])).map(row => Number(row.is_active)),
            'The skin robe is never dropped and stays equipped'
        ).toEqual([1]);
        expect((await DeathReviveSteps.expectAliveInForest(context)).avatarKey, 'The skin stays after the revive')
            .toBe(skinData.skinKey);
    }

    static async runNoAnimationDropTest(context)
    {
        let gameConfig = context.gameConfig;
        await DeathDropSteps.prepareDrops(context, {[DeathDropSteps.DROP_QUANTITY_PATH]: 1});
        await DeathDropSteps.carryOnlyTheEquippedAxe(context);
        await ItemsSteps.changeItemCustomData(context, gameConfig.e2eEquipableItemId, {canBeDropped: false});
        await ItemsSteps.changeItemCustomData(context, TestDeathDropsSelection.ROBE, {canBeDropped: true});
        await E2eSeedAndRestoreApi.seedInventoryItem(gameConfig, context.e2eGroup, gameConfig.e2ePlayerName, TestDeathDropsSelection.ROBE, 1);
        let robeId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'itemsItem', {key: TestDeathDropsSelection.ROBE});
        expect(await E2eSeedAndRestoreApi.loadRows(gameConfig, 'dropsAnimations', {item_id: robeId}), 'The robe has no drop animation')
            .toEqual([]);
        let placement = await DeathDropSteps.enterForDrops(context);
        await DeathDropSteps.killOnPlayerTile(context, placement, 'The player dies carrying a robe with no drop animation');
        await expect.poll(
            async () => (await DeathDropSteps.fetchInventoryRows(context, [TestDeathDropsSelection.ROBE])).length,
            {message: 'The robe drops', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(0);
        expect(await TestDeathDropsSelection.expectDropsReceived(context.page), 'The robe drop is not sent').toEqual([]);
        expect(
            (await DeathDropSteps.fetchRoomDrops(gameConfig)).filter(drop => robeId === drop.itemId),
            'The robe drop object is created in the room'
        ).toHaveLength(1);
    }

    static async runOtherPlayerPickUpTest(context)
    {
        let gameConfig = context.gameConfig;
        let secondPlayerConfig = Login.fetchSecondPlayerConfig(gameConfig);
        let axeKey = gameConfig.e2eEquipableItemId;
        await DeathDropSteps.prepareDrops(context, {[DeathDropSteps.DROP_QUANTITY_PATH]: 1});
        test.setTimeout(test.info().timeout + TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, context.longRun));
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, context.e2eGroup, 'itemsInventory', {
            owner_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: secondPlayerConfig.e2ePlayerName})
        });
        await DeathDropSteps.carryOnlyTheEquippedAxe(context);
        let secondAxeQuantity = await E2eSeedAndRestoreApi.fetchInventoryQuantity(gameConfig, secondPlayerConfig.e2ePlayerName, axeKey);
        await Login.loginAndEnterForest(context.secondPage, secondPlayerConfig, context.longRun);
        await RoomMessagesRecorder.start(context.secondPage);
        let placement = await DeathDropSteps.enterForDrops(context);
        await DeathDropSteps.killOnPlayerTile(context, placement, 'The player dies dropping its axe');
        let [dropId] = await TestDeathDropsSelection.expectDropsReceived(context.secondPage);
        let placed = await RoomObjectsApi.placePlayerNextToObject(
            context.secondPage,
            secondPlayerConfig,
            Login.FOREST_ROOM_NAME,
            dropId,
            TimeConstants.SERVER_RESPONSE
        );
        expect(placed.reached, 'The second player is placed next to the drop').toBe(true);
        await RoomMessagesRecorder.sendMessage(context.secondPage, {
            act: ObjectsConst.OBJECT_INTERACTION,
            type: ObjectsConst.DROPS.PICK_UP_ACT,
            id: dropId
        });
        await expect.poll(
            async () => await E2eSeedAndRestoreApi.fetchInventoryQuantity(gameConfig, secondPlayerConfig.e2ePlayerName, axeKey),
            {message: 'The second player stores the picked axe', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(secondAxeQuantity + 1);
        expect((await DeathDropSteps.fetchRoomDrops(gameConfig)).map(drop => drop.id), 'The drop leaves the room').not.toContain(dropId);
        for(let clientPage of [context.page, context.secondPage]){
            await expect.poll(
                async () => (await RoomMessagesRecorder.fetchMessages(clientPage, ObjectsConst.DROPS.REMOVE)).map(message => message.id),
                {message: 'Both clients receive the drop removal', timeout: TimeConstants.SERVER_RESPONSE}
            ).toContain(dropId);
        }
    }

    static run()
    {
        test.describe('Death Drops Selection', () => {
            test('drop percent 0 drops nothing and keeps every item', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathDropsSelection.runNoDropPercentTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('drop quantity above the droppable items drops them and keeps the non droppable ones', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathDropsSelection.runAboveDroppableQuantityTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('drop quantity 2 with three droppable items drops exactly two', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathDropsSelection.runPartialDropQuantityTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('item with its own drop percent at 0 is never dropped and stays equipped', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathDropsSelection.runOwnDropPercentTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('equipped droppable item not dropped stays equipped', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathDropsSelection.runNotSelectedEquippedTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('equipped skin robe is never dropped and the skin stays after the revive', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathDropsSelection.runEquippedSkinTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('drop with no drop animation creates the room object and is never sent', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathDropsSelection.runNoAnimationDropTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('second player picks up the drop and both clients remove it', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathDropsSelection.runOtherPlayerPickUpTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestDeathDropsSelection.run();
