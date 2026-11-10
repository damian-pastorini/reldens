/**
 *
 * Reldens - Test Death Drops
 *
 * Tests the player items dropped on death with the drop percent at 100 and the drop quantity at 1 for the group (the
 * stored config values are restored by the group reset): the dead player carries only its equipped axe (the axe row is
 * stored as equipped and the heal potions stack is moved to the second player, the second player potions rows are
 * preserved first, so the group reset removes the moved stack from it before restoring the first player rows), so the
 * axe is the single drop. Before the kill the player sends a tap move to its own position, so the server body keeps its
 * tile when it is removed from the world on the death (the drop position is read from that tile). A second client in
 * the forest receives the drops broadcast with the axe drop asset, the axe leaves the dead player inventory and it is
 * unequipped, the attack the axe modifier added is removed; the dead player can not pick up its own drop; and with the
 * drop quantity at 0 nothing drops.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { DeathReviveSteps } = require('./helpers/death-revive-steps');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { TimeConstants } = require('./helpers/time-constants');
const { Login } = require('./helpers/login');
const { Navigation } = require('./helpers/navigation');
const { Phaser } = require('./helpers/phaser');
const { ActionsConst } = require('../../lib/actions/constants');
const { ObjectsConst } = require('../../lib/objects/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestDeathDrops
{

    static AXE = 'axe';
    static HEAL_POTION = 'heal_potion_20';
    static DROP_QUANTITY_PATH = 'server/players/drop/quantity';
    static FULL_DROP_PERCENT = 100;
    static DROPPED_QUANTITY = 1;
    static QUIET_MS = 1500;
    static TILE_MOVE_MS = 500;

    static async fetchDrops(clientPage)
    {
        return await clientPage.evaluate(
            (dropsKey) => (window.e2eRoomMessages || []).filter(message => message[dropsKey]).map(
                message => message[dropsKey]
            ),
            ObjectsConst.DROPS.KEY
        );
    }

    static async killOnPlayerTile(context, placement, deathMessage)
    {
        let position = await Phaser.getPlayerServerPosition(context.page);
        await Navigation.moveToWorldPoint(context.page, position.x, position.y);
        await context.page.waitForTimeout(TestDeathDrops.TILE_MOVE_MS);
        await DeathReviveSteps.killPlayerInForest(context, placement, deathMessage);
    }

    static async carryOnlyTheEquippedAxe(gameConfig, e2eGroup, secondPlayerName)
    {
        let playerName = gameConfig.e2ePlayerName;
        let axeFilters = await E2eSeedAndRestoreApi.fetchInventoryFilters(gameConfig, playerName, TestDeathDrops.AXE);
        await E2eSeedAndRestoreApi.updateWithPreserve(gameConfig, e2eGroup, 'itemsInventory', axeFilters, {is_active: 1});
        let secondPlayerPotionFilters = await E2eSeedAndRestoreApi.fetchInventoryFilters(
            gameConfig,
            secondPlayerName,
            TestDeathDrops.HEAL_POTION
        );
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, e2eGroup, 'itemsInventory', secondPlayerPotionFilters);
        await E2eSeedAndRestoreApi.updateWithPreserve(
            gameConfig,
            e2eGroup,
            'itemsInventory',
            await E2eSeedAndRestoreApi.fetchInventoryFilters(gameConfig, playerName, TestDeathDrops.HEAL_POTION),
            {owner_id: secondPlayerPotionFilters.owner_id}
        );
        return axeFilters;
    }

    static async runEquippedItemDropTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = {page, screenshots, gameConfig, e2eGroup, longRun};
        await DeathReviveSteps.prepareDeath(context, {
            [ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: false,
            [DeathReviveSteps.DROP_PERCENT_PATH]: TestDeathDrops.FULL_DROP_PERCENT,
            [TestDeathDrops.DROP_QUANTITY_PATH]: TestDeathDrops.DROPPED_QUANTITY
        });
        let secondPlayerConfig = Login.fetchSecondPlayerConfig(gameConfig);
        let axeFilters = await TestDeathDrops.carryOnlyTheEquippedAxe(
            gameConfig,
            e2eGroup,
            secondPlayerConfig.e2ePlayerName
        );
        await Login.loginAndEnterForest(secondPage, secondPlayerConfig, longRun);
        await RoomMessagesRecorder.start(secondPage);
        let placement = await DeathReviveSteps.enterForest(context, true);
        let fetchPlayer = async () => await GameplayE2eStateApi.fetchPlayer(
            gameConfig,
            Login.FOREST_ROOM_NAME,
            gameConfig.e2ePlayerName
        );
        let attackWithAxe = (await fetchPlayer()).stats.atk;
        await TestDeathDrops.killOnPlayerTile(context, placement, 'The player dies carrying only its equipped axe');
        await expect.poll(
            async () => (await TestDeathDrops.fetchDrops(secondPage)).length,
            {message: 'The second client receives the drops', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBeGreaterThan(0);
        let drops = [...await TestDeathDrops.fetchDrops(secondPage)].shift();
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
        await DeathReviveSteps.prepareDeath(context, Object.assign({
            [ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: false,
            [DeathReviveSteps.DROP_PERCENT_PATH]: TestDeathDrops.FULL_DROP_PERCENT
        }, deathConfig));
        let axeFilters = await TestDeathDrops.carryOnlyTheEquippedAxe(
            context.gameConfig,
            context.e2eGroup,
            Login.fetchSecondPlayerConfig(context.gameConfig).e2ePlayerName
        );
        let placement = await DeathReviveSteps.enterForest(context, true);
        await RoomMessagesRecorder.start(context.page);
        await TestDeathDrops.killOnPlayerTile(context, placement, deathMessage);
        return axeFilters;
    }

    static async runDeadPickUpTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        let axeFilters = await TestDeathDrops.killPlayerCarryingOnlyTheAxe(
            {page, screenshots, gameConfig, e2eGroup, longRun},
            Object.assign(
                {[TestDeathDrops.DROP_QUANTITY_PATH]: TestDeathDrops.DROPPED_QUANTITY},
                DeathReviveSteps.MANUAL_REVIVE_CONFIG
            ),
            'The player dies dropping its axe'
        );
        await expect.poll(
            async () => await E2eSeedAndRestoreApi.loadRows(gameConfig, 'itemsInventory', axeFilters),
            {message: 'The axe is dropped', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual([]);
        await expect.poll(
            async () => (await TestDeathDrops.fetchDrops(page)).length,
            {message: 'The dead player client receives its drop', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBeGreaterThan(0);
        await RoomMessagesRecorder.sendMessage(page, {
            act: ObjectsConst.OBJECT_INTERACTION,
            type: ObjectsConst.DROPS.PICK_UP_ACT,
            id: [...Object.keys([...await TestDeathDrops.fetchDrops(page)].shift())].shift()
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
            {[TestDeathDrops.DROP_QUANTITY_PATH]: 0},
            'The player dies with a drop quantity of 0'
        );
        await page.waitForTimeout(TestDeathDrops.QUIET_MS);
        expect(await TestDeathDrops.fetchDrops(page), 'No drop').toEqual([]);
        expect(await E2eSeedAndRestoreApi.loadRows(gameConfig, 'itemsInventory', axeFilters), 'Axe kept').toHaveLength(1);
    }

    static run()
    {
        test.describe('Death Drops', () => {
            test('dead player can not pick up its own drop', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathDrops.runDeadPickUpTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('drop quantity 0 with the drop percent at 100 drops nothing', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathDrops.runNoDropQuantityTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('dead player drops its equipped item, unequipped, and a second client receives the drop', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathDrops.runEquippedItemDropTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
        });
    }

}

TestDeathDrops.run();
