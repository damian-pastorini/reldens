/**
 *
 * Reldens - Test Death Drops
 *
 * Tests the player items dropped on death with the drop percent at 100 and the drop quantity at 1 for the group (the
 * stored config values are restored by the group reset): the dead player carries only its equipped axe
 * (DeathDropSteps), so the axe is the single drop, killed on its own tile. A second client in
 * the forest receives the drops broadcast with the axe drop asset, the axe leaves the dead player inventory and it is
 * unequipped, the attack the axe modifier added is removed; the dead player can not pick up its own drop, also with the
 * auto pick up on hit on while its body is over the drop; and with the drop quantity at 0 nothing drops.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { DeathReviveSteps } = require('./helpers/death-revive-steps');
const { DeathDropSteps } = require('./helpers/death-drop-steps');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
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
        });
    }

}

TestDeathDrops.run();
