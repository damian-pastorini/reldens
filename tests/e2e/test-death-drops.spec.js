/**
 *
 * Reldens - Test Death Drops
 *
 * Tests the player items dropped on death with the drop percent at 100 and the drop quantity at 1 for the group (the
 * stored config values are restored by the group reset): the dead player carries only its equipped axe
 * (DeathDropSteps), so the axe is the single drop, killed on its own tile. A second client in
 * the forest receives the drops broadcast with the axe drop asset, the axe leaves the dead player inventory and it is
 * unequipped, the attack the axe modifier added is removed; the dead player can not pick up its own drop, also with the
 * auto pick up on hit on while its body is over the drop; with the drop quantity at 0 nothing drops; and with the
 * equipped items drop off (server/players/drop/equippedItems, read once by the inventory death subscriber, so the group
 * changes its live dropEquippedItems) nothing drops and the axe stays stored equipped. A player that walked with the
 * keys after a tap move, or never made a tap move, drops next to the tile it died on (the drop tile comes from the body
 * position on the room world, even once the dead body was removed from the world).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { DeathReviveSteps } = require('./helpers/death-revive-steps');
const { DeathDropSteps } = require('./helpers/death-drop-steps');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { RoomMovementApi } = require('./helpers/room-movement-api');
const { Navigation } = require('./helpers/navigation');
const { Phaser } = require('./helpers/phaser');
const { TimeConstants } = require('./helpers/time-constants');
const { Login } = require('./helpers/login');
const { ObjectsConst } = require('../../lib/objects/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestDeathDrops
{

    static DROPPED_QUANTITY = 1;
    static QUIET_MS = 1500;
    static AUTO_PICK_UP_PATH = 'server/objects/drops/autoPickUpOnHit';
    static DEATH_SUBSCRIBER_FEATURE_PATH = 'inventory/package/playerDeathSubscriber';
    static WALK_TILES = 4;
    static WALK_DIRECTIONS = {'1,0': 'right', '-1,0': 'left', '0,1': 'down', '0,-1': 'up'};

    static async runEquippedItemDropTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = {page, screenshots, gameConfig, e2eGroup, longRun};
        await DeathDropSteps.prepareDrops(context, {[DeathDropSteps.DROP_QUANTITY_PATH]: TestDeathDrops.DROPPED_QUANTITY});
        let axeFilters = await DeathDropSteps.carryOnlyTheEquippedAxe(context);
        await Login.loginAndEnterForest(secondPage, Login.fetchSecondPlayerConfig(gameConfig), longRun);
        await RoomMessagesRecorder.start(secondPage);
        let placement = await DeathReviveSteps.enterForest(context, true);
        let fetchPlayer = async () => await GameplayE2eStateApi.fetchPlayer(
            gameConfig,
            Login.FOREST_ROOM_NAME,
            gameConfig.e2ePlayerName
        );
        let attackWithAxe = (await fetchPlayer()).stats.atk;
        await DeathDropSteps.killOnPlayerTile(context, placement, 'The player dies carrying only its equipped axe');
        await expect.poll(
            async () => (await DeathDropSteps.fetchDrops(secondPage)).length,
            {message: 'The second client receives the drops', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBeGreaterThan(0);
        let drops = [...await DeathDropSteps.fetchDrops(secondPage)].shift();
        expect(Object.keys(drops), 'A single drop').toHaveLength(TestDeathDrops.DROPPED_QUANTITY);
        let axeDropAnimation = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'dropsAnimations', {
            item_id: axeFilters.item_id
        })].shift();
        expect(drops[[...Object.keys(drops)].shift()][ObjectsConst.DROPS.ASSET_KEY], 'The axe is dropped').toBe(
            axeDropAnimation.asset_key
        );
        expect(await E2eSeedAndRestoreApi.loadRows(gameConfig, 'itemsInventory', axeFilters), 'Axe gone').toEqual([]);
        expect((await fetchPlayer()).stats.atk, 'The axe is unequipped').toBeLessThan(attackWithAxe);
        await screenshots.capture(secondPage, 'death-drop-second-client');
    }

    static async killPlayerCarryingOnlyTheAxe(context, deathConfig, deathMessage)
    {
        await DeathDropSteps.prepareDrops(context, deathConfig);
        let axeFilters = await DeathDropSteps.carryOnlyTheEquippedAxe(context);
        await DeathDropSteps.killOnPlayerTile(context, await DeathDropSteps.enterForDrops(context), deathMessage);
        return axeFilters;
    }

    static async runDeadPickUpTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun, dropsConfig = {})
    {
        let axeFilters = await TestDeathDrops.killPlayerCarryingOnlyTheAxe(
            {page, screenshots, gameConfig, e2eGroup, longRun},
            Object.assign(
                {[DeathDropSteps.DROP_QUANTITY_PATH]: TestDeathDrops.DROPPED_QUANTITY},
                DeathReviveSteps.MANUAL_REVIVE_CONFIG,
                dropsConfig
            ),
            'The player dies dropping its axe'
        );
        await expect.poll(
            async () => await E2eSeedAndRestoreApi.loadRows(gameConfig, 'itemsInventory', axeFilters),
            {message: 'The axe is dropped', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual([]);
        await expect.poll(
            async () => (await DeathDropSteps.fetchDrops(page)).length,
            {message: 'The dead player client receives its drop', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBeGreaterThan(0);
        await RoomMessagesRecorder.sendMessage(page, {
            act: ObjectsConst.OBJECT_INTERACTION,
            type: ObjectsConst.DROPS.PICK_UP_ACT,
            id: [...Object.keys([...await DeathDropSteps.fetchDrops(page)].shift())].shift()
        });
        await page.waitForTimeout(TestDeathDrops.QUIET_MS);
        expect(
            await E2eSeedAndRestoreApi.loadRows(gameConfig, 'itemsInventory', axeFilters),
            'The dead player does not pick up its drop'
        ).toEqual([]);
    }

    static async runNoDropQuantityTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        let axeFilters = await TestDeathDrops.killPlayerCarryingOnlyTheAxe(
            {page, screenshots, gameConfig, e2eGroup, longRun},
            {[DeathDropSteps.DROP_QUANTITY_PATH]: 0},
            'The player dies with a drop quantity of 0'
        );
        await page.waitForTimeout(TestDeathDrops.QUIET_MS);
        expect(await DeathDropSteps.fetchDrops(page), 'No drop').toEqual([]);
        expect(await E2eSeedAndRestoreApi.loadRows(gameConfig, 'itemsInventory', axeFilters), 'Axe kept').toHaveLength(1);
    }

    static async fetchForestPlayer(gameConfig)
    {
        return await RoomMovementApi.fetchPlayer(gameConfig, Login.FOREST_ROOM_NAME, gameConfig.e2ePlayerName);
    }

    static async walkWithTheKeysAfterATapMove(context)
    {
        let gameConfig = context.gameConfig;
        let position = await Phaser.getPlayerServerPosition(context.page);
        await Navigation.moveToWorldPoint(context.page, position.x, position.y);
        await context.page.waitForTimeout(DeathDropSteps.TILE_MOVE_MS);
        let tapped = await TestDeathDrops.fetchForestPlayer(gameConfig);
        let walkTile = await RoomMovementApi.fetchClearLineTile(
            gameConfig,
            Login.FOREST_ROOM_NAME,
            gameConfig.e2ePlayerName,
            [TestDeathDrops.WALK_TILES + 1]
        );
        expect(walkTile, 'A clear line of tiles starts on the player').toBeTruthy();
        let walkedTiles = (snapshot) => Math.abs(snapshot.currentCol - tapped.currentCol)
            + Math.abs(snapshot.currentRow - tapped.currentRow);
        await context.page.evaluate((direction) => {
            window.reldens.getActiveScene().player[direction]();
        }, TestDeathDrops.WALK_DIRECTIONS[[
            Math.sign(walkTile[0] - tapped.currentCol),
            Math.sign(walkTile[1] - tapped.currentRow)
        ].join(',')]);
        await RoomMovementApi.collectTrail(
            async () => await TestDeathDrops.fetchForestPlayer(gameConfig),
            (snapshot) => TestDeathDrops.WALK_TILES <= walkedTiles(snapshot),
            TimeConstants.NAVIGATION
        );
        await context.page.evaluate(() => {
            window.reldens.getActiveScene().player.stop();
        });
        let walked = await RoomMovementApi.waitForPlayerStill(
            gameConfig,
            Login.FOREST_ROOM_NAME,
            gameConfig.e2ePlayerName,
            TimeConstants.SERVER_RESPONSE
        );
        expect(walkedTiles(walked), 'The player walked away from its tap move tile').toBeGreaterThanOrEqual(
            TestDeathDrops.WALK_TILES
        );
    }

    static async expectDropNextToTheDeathTile(context)
    {
        let gameConfig = context.gameConfig;
        await expect.poll(
            async () => (await DeathDropSteps.fetchRoomDrops(gameConfig)).length,
            {message: 'The axe is dropped', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(TestDeathDrops.DROPPED_QUANTITY);
        let drop = [...await DeathDropSteps.fetchRoomDrops(gameConfig)].shift();
        let deadPlayer = await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.FOREST_ROOM_NAME, gameConfig.e2ePlayerName);
        let tileSize = Navigation.TILE_SIZE;
        expect(
            Math.max(
                Math.abs(Math.floor(drop.x / tileSize) - Math.round((deadPlayer.x - tileSize / 2) / tileSize)),
                Math.abs(Math.floor(drop.y / tileSize) - Math.round((deadPlayer.y - tileSize / 2) / tileSize))
            ),
            'The drop lands on a tile next to the tile the player died on'
        ).toBeLessThanOrEqual(1);
        await context.screenshots.capture(context.page, 'drop-next-to-the-death-tile');
    }

    static async runDropAfterKeysWalkTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = {page, screenshots, gameConfig, e2eGroup, longRun};
        await DeathDropSteps.prepareDrops(context, {[DeathDropSteps.DROP_QUANTITY_PATH]: TestDeathDrops.DROPPED_QUANTITY});
        await DeathDropSteps.carryOnlyTheEquippedAxe(context);
        let placement = await DeathDropSteps.enterForDrops(context);
        await TestDeathDrops.walkWithTheKeysAfterATapMove(context);
        await DeathReviveSteps.killPlayerInForest(context, placement, 'The player dies after walking with the keys');
        await TestDeathDrops.expectDropNextToTheDeathTile(context);
    }

    static async runDropWithoutTapMoveTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = {page, screenshots, gameConfig, e2eGroup, longRun};
        await DeathDropSteps.prepareDrops(context, {[DeathDropSteps.DROP_QUANTITY_PATH]: TestDeathDrops.DROPPED_QUANTITY});
        await DeathDropSteps.carryOnlyTheEquippedAxe(context);
        let placement = await DeathDropSteps.enterForDrops(context);
        await DeathReviveSteps.killPlayerInForest(context, placement, 'The player dies without a tap move');
        await TestDeathDrops.expectDropNextToTheDeathTile(context);
    }

    static async runEquippedItemsDropOffTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        let changedProperty = await GameplayE2eStateApi.changeFeatureProperty(
            gameConfig,
            e2eGroup,
            TestDeathDrops.DEATH_SUBSCRIBER_FEATURE_PATH,
            'dropEquippedItems',
            false
        );
        expect(changedProperty.value, 'The equipped items drop is off').toBe(false);
        let axeFilters = await TestDeathDrops.killPlayerCarryingOnlyTheAxe(
            {page, screenshots, gameConfig, e2eGroup, longRun},
            {[DeathDropSteps.DROP_QUANTITY_PATH]: TestDeathDrops.DROPPED_QUANTITY},
            'The player dies carrying only its equipped axe'
        );
        await page.waitForTimeout(TestDeathDrops.QUIET_MS);
        expect(await DeathDropSteps.fetchDrops(page), 'No drop').toEqual([]);
        expect(
            (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'itemsInventory', axeFilters)).map(row => Number(row.is_active)),
            'The axe is kept stored equipped'
        ).toEqual([1]);
    }

    static run()
    {
        test.describe('Death Drops', () => {
            test('dead player can not pick up its own drop', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathDrops.runDeadPickUpTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('dead player over its own drop with auto pick up on hit does not pick it up', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathDrops.runDeadPickUpTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun, {
                    [TestDeathDrops.AUTO_PICK_UP_PATH]: true
                });
            });
            test('drop quantity 0 with the drop percent at 100 drops nothing', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathDrops.runNoDropQuantityTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('dead player drops its equipped item, unequipped, and a second client receives the drop', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathDrops.runEquippedItemDropTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('with the equipped items drop off the dead player drops nothing and keeps its axe equipped', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathDrops.runEquippedItemsDropOffTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('dead player that walked with the keys after a tap move drops next to the tile it died on', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathDrops.runDropAfterKeysWalkTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('dead player that never made a tap move drops next to the tile it died on', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathDrops.runDropWithoutTapMoveTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
        });
    }

}

TestDeathDrops.run();
