/**
 *
 * Reldens - Test Death Teleport
 *
 * Tests the death teleport to town: with the teleport enabled for the group, the player killed in the forest by a real
 * enemy hit revives in the configured town room; with the restoration item it revives in the forest and the item is
 * consumed; and the resurrection ad played while dead rewards the restoration item that revives the player in the
 * forest. The town room, the item and the ad come from the stored config rows; the aggressive enemies are disabled
 * after the death so the revived player is not killed again.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Navigation } = require('./helpers/navigation');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { TestCombatDeath } = require('./helpers/test-combat-death');
const { AdMessagesPlayer } = require('./helpers/ad-messages-player');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { LongRunShowcase } = require('./helpers/long-run-showcase');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ActionsConst } = require('../../lib/actions/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestDeathTeleport
{

    static async prepareDeathTeleport(gameConfig, e2eGroup, longRun)
    {
        test.setTimeout(
            TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, longRun)
            + TimeConstants.ENEMY_KILL
            + TimeConstants.PLAYER_REVIVE
            + TimeConstants.forLongRun(TimeConstants.ROOM_TRANSITION, longRun)
        );
        await E2eSeedAndRestoreApi.overrideConfig(
            gameConfig,
            e2eGroup,
            ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED,
            true
        );
        return await E2eSeedAndRestoreApi.fetchConfigValue(
            gameConfig,
            ActionsConst.DEATH.CONFIG_PATHS.RESTORATION_ITEM_KEY
        );
    }

    static async killPlayerInForest(page, screenshots, gameConfig, longRun)
    {
        await Login.loginAndEnterForest(page, gameConfig, longRun);
        await LongRunShowcase.openPanel(page, Selectors.hud.inventoryOpen, Selectors.inventory.ui, longRun);
        await TestCombatDeath.killPlayerWithEnemyAttack(
            page,
            gameConfig,
            gameConfig.e2eEnemyKey,
            TimeConstants.ENEMY_KILL
        );
        await RoomObjectsApi.disableEnemies(gameConfig, Login.FOREST_ROOM_NAME, true);
        await screenshots.capture(page, 'player-dead-in-forest');
    }

    static async expectRevivedInForest(page, screenshots, gameConfig, restorationItemKey, longRun)
    {
        let revived = await TestCombatDeath.waitForPlayerHpCondition(page, 'alive', TimeConstants.PLAYER_REVIVE);
        expect(revived, 'The player must revive').toBe(true);
        expect(await Navigation.getCurrentRoomName(page), 'The player must revive where it died').toBe(
            Login.FOREST_ROOM_NAME
        );
        let restorationRows = await E2eSeedAndRestoreApi.loadInventoryRows(
            gameConfig,
            gameConfig.e2ePlayerName,
            restorationItemKey
        );
        expect(
            restorationRows.filter(row => 0 < Number(row.qty)),
            'The revive must consume the restoration item'
        ).toEqual([]);
        await LongRunShowcase.showElementsCount(
            page,
            Selectors.inventory.itemImage(restorationItemKey),
            0,
            TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun),
            longRun
        );
        await screenshots.capture(page, 'player-revived-in-forest');
    }

    static async runTownReviveTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        await TestDeathTeleport.prepareDeathTeleport(gameConfig, e2eGroup, longRun);
        let townRoomId = Number(
            await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ROOM_ID)
        );
        let townRoomName = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'rooms', {id: townRoomId})].shift().name;
        await TestDeathTeleport.killPlayerInForest(page, screenshots, gameConfig, longRun);
        await Navigation.waitForRoom(
            page,
            townRoomName,
            TimeConstants.PLAYER_REVIVE + TimeConstants.forLongRun(TimeConstants.ROOM_TRANSITION, longRun)
        );
        await expect.poll(
            async () => (await GameplayE2eStateApi.fetchPlayer(gameConfig, townRoomName, gameConfig.e2ePlayerName)).life,
            {message: 'The player must be alive in the town room'}
        ).toBeGreaterThan(0);
        await LongRunShowcase.pause(page, longRun);
        await screenshots.capture(page, 'player-revived-in-town');
    }

    static async runRestorationItemTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let restorationItemKey = await TestDeathTeleport.prepareDeathTeleport(gameConfig, e2eGroup, longRun);
        await E2eSeedAndRestoreApi.seedInventoryItem(
            gameConfig,
            e2eGroup,
            gameConfig.e2ePlayerName,
            restorationItemKey,
            1
        );
        await TestDeathTeleport.killPlayerInForest(page, screenshots, gameConfig, longRun);
        await TestDeathTeleport.expectRevivedInForest(page, screenshots, gameConfig, restorationItemKey, longRun);
    }

    static async runResurrectionAdTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let restorationItemKey = await TestDeathTeleport.prepareDeathTeleport(gameConfig, e2eGroup, longRun);
        let resurrectionAd = await AdMessagesPlayer.enableAd(
            gameConfig,
            e2eGroup,
            await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, ActionsConst.DEATH.CONFIG_PATHS.RESURRECTION_ADS_KEY),
            gameConfig.e2ePlayerName
        );
        await TestDeathTeleport.killPlayerInForest(page, screenshots, gameConfig, longRun);
        await AdMessagesPlayer.playAd(page, resurrectionAd);
        await TestDeathTeleport.expectRevivedInForest(page, screenshots, gameConfig, restorationItemKey, longRun);
    }

    static run()
    {
        test.describe('Death Teleport', () => {
            test('dead player revives in the town room with the death teleport enabled', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathTeleport.runTownReviveTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('dead player with the restoration item revives where it died and consumes the item', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathTeleport.runRestorationItemTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('resurrection ad rewards the restoration item that revives the dead player where it died', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathTeleport.runResurrectionAdTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
        });
    }

}

TestDeathTeleport.run();
