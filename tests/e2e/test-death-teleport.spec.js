/**
 *
 * Reldens - Test Death Teleport
 *
 * Tests the death teleport to town: with the teleport enabled for the group, the player killed in the forest by a real
 * enemy hit revives in the configured town room; with the restoration item it revives in the forest and the item is
 * consumed; and the resurrection ad, offered by a button in the game over box and played by the client ads provider
 * through the e2e SDK mock (AdMessagesPlayer) only when that button is clicked, rewards the restoration item that revives
 * the player in the forest. The game over box shows the translated revive message of each case (the town room title or
 * the restoration item label, read from their stored rows), the ad button only when the ad is offered, and the item
 * message once the ad reward is given. The town room, the item and
 * the ad come from the stored config rows; the aggressive enemies are disabled after the death so the revived player is
 * not killed again. Before the long run recording starts, a passive enemy is placed and targeted next to the player at
 * the center of the map and the player life is lowered (ForestEnemyKill), then its battle starts in place, so the video
 * shows every enemy hit that kills the player with the chat damage messages, and the passive enemy never attacks the
 * revived player.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Navigation } = require('./helpers/navigation');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { TestCombatDeath } = require('./helpers/test-combat-death');
const { ForestEnemyKill } = require('./helpers/forest-enemy-kill');
const { AdMessagesPlayer } = require('./helpers/ad-messages-player');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { LongRunShowcase } = require('./helpers/long-run-showcase');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ActionsConst } = require('../../lib/actions/constants');
const ActionsTranslations = require('../../lib/actions/client/snippets/en_US');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestDeathTeleport
{

    static LONG_RUN_PLAYER_LIFE = 16;
    static DEATH_SNIPPETS = ActionsTranslations.actions.death;

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

    static async enterForest(page, gameConfig, longRun)
    {
        let forestData = await Login.loginAndEnterForest(page, gameConfig, longRun);
        let placement = longRun
            ? await ForestEnemyKill.placeEnemyToKillPlayer(
                page,
                gameConfig,
                TestDeathTeleport.LONG_RUN_PLAYER_LIFE,
                forestData.sceneTimeout
            )
            : {};
        await LongRunShowcase.startGameplayRecording(page, longRun);
        await LongRunShowcase.openPanel(page, Selectors.hud.inventoryOpen, Selectors.inventory.ui, longRun);
        await LongRunShowcase.openPanel(page, Selectors.hud.chatOpen, Selectors.chat.input, longRun);
        return placement;
    }

    static async killPlayerInForest(page, screenshots, gameConfig, placement, longRun)
    {
        await (longRun
            ? ForestEnemyKill.fightUntilPlayerDeath(page, gameConfig, placement.enemyKey, TimeConstants.ENEMY_KILL)
            : TestCombatDeath.killPlayerWithEnemyAttack(
                page,
                gameConfig,
                gameConfig.e2eEnemyKey,
                TimeConstants.ENEMY_KILL
            ));
        await RoomObjectsApi.disableEnemies(gameConfig, Login.FOREST_ROOM_NAME, true);
        await screenshots.capture(page, 'player-dead-in-forest');
    }

    static async expectTownGameOverMessage(page, screenshots, gameConfig, resurrectionAdButtons, longRun)
    {
        let townRoomId = Number(
            await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ROOM_ID)
        );
        let townRoom = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'rooms', {id: townRoomId})].shift();
        await TestDeathTeleport.expectGameOverMessage(
            page,
            screenshots,
            TestDeathTeleport.DEATH_SNIPPETS.reviveInTown.replace('%townLabel', townRoom.title),
            resurrectionAdButtons,
            longRun
        );
        return townRoom.name;
    }

    static async expectGameOverMessage(page, screenshots, reviveMessage, resurrectionAdButtons, longRun)
    {
        await expect(page.locator(Selectors.gameOver.box), 'The game over box must be shown').toBeVisible();
        await expect(page.locator(Selectors.gameOver.title)).toHaveText(TestDeathTeleport.DEATH_SNIPPETS.title);
        await expect(
            page.locator(Selectors.gameOver.reviveMessage),
            'The game over box must tell how the player revives'
        ).toHaveText(reviveMessage);
        await expect(
            page.locator(Selectors.gameOver.resurrectionAdButton),
            'The resurrection ad button is shown only when the ad is offered'
        ).toHaveCount(resurrectionAdButtons);
        await screenshots.capture(page, 'game-over-revive-message');
        await LongRunShowcase.pause(page, longRun);
    }

    static async expectRevivedInForest(page, screenshots, gameConfig, restorationItemKey, longRun)
    {
        let restorationItem = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'itemsItem', {
            key: restorationItemKey
        })].shift();
        await TestDeathTeleport.expectGameOverMessage(
            page,
            screenshots,
            TestDeathTeleport.DEATH_SNIPPETS.reviveWithRestorationItem.replace('%itemLabel', restorationItem.label),
            0,
            longRun
        );
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
        let placement = await TestDeathTeleport.enterForest(page, gameConfig, longRun);
        await TestDeathTeleport.killPlayerInForest(page, screenshots, gameConfig, placement, longRun);
        let townRoomName = await TestDeathTeleport.expectTownGameOverMessage(page, screenshots, gameConfig, 0, longRun);
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
        let placement = await TestDeathTeleport.enterForest(page, gameConfig, longRun);
        await TestDeathTeleport.killPlayerInForest(page, screenshots, gameConfig, placement, longRun);
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
        let placement = await TestDeathTeleport.enterForest(page, gameConfig, longRun);
        let adTimeout = TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun);
        await AdMessagesPlayer.waitForProviderReady(page, adTimeout);
        await TestDeathTeleport.killPlayerInForest(page, screenshots, gameConfig, placement, longRun);
        await TestDeathTeleport.expectTownGameOverMessage(page, screenshots, gameConfig, 1, longRun);
        await expect(
            page.locator(AdMessagesPlayer.AD_OVERLAY_SELECTOR),
            'The resurrection ad must not play before the player asks for it'
        ).toHaveCount(0);
        await expect(page.locator(Selectors.gameOver.resurrectionAdButton)).toHaveText(
            TestDeathTeleport.DEATH_SNIPPETS.resurrectionAdButton
        );
        await page.click(Selectors.gameOver.resurrectionAdButton);
        await AdMessagesPlayer.waitForPlayedAd(page, resurrectionAd, adTimeout);
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
