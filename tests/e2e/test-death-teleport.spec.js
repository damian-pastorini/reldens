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
 * message once the ad reward is given. The town room, the item and the ad come from the stored config rows. It also
 * tests the revive options set for the group: without the restoration item auto consume the game over box asks to use
 * the carried item, the yes button revives the player where it died consuming the item and the no button keeps the
 * item and revives it in the town room; without the auto revive the game over box tells the seconds left to the
 * revive, the player stays dead once that time passed and the revive button revives it where it died, with the death
 * teleport disabled or consuming the chosen restoration item. With two dead players, the revive of one closes only its
 * own game over box, the other player stays dead with its box open, and both clients show the revived player and play
 * its revive animation. The death and revive steps are the DeathReviveSteps ones,
 * the long run recording steps tell the general flow of each case (DeathReviveShowcase), the HUD shows the life.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { DeathReviveSteps } = require('./helpers/death-revive-steps');
const { DeathReviveShowcase } = require('./helpers/death-revive-showcase');
const { LongRunShowcase } = require('./helpers/long-run-showcase');
const { DeathResurrectionAdSteps } = require('./helpers/death-resurrection-ad-steps');
const { SceneSpritesRecorder } = require('./helpers/scene-sprites-recorder');
const { TestCombatDeath } = require('./helpers/test-combat-death');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { Navigation } = require('./helpers/navigation');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ActionsConst } = require('../../lib/actions/constants');
const { PlayerReviveDisplay } = require('../../lib/game/client/player-revive-display');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestDeathTeleport
{

    static async runTownReviveTest(context)
    {
        await DeathReviveSteps.prepareDeath(context);
        await DeathReviveSteps.killPlayerInForest(
            context,
            await DeathReviveSteps.enterForest(context),
            'The player died: it revives in '+context.reviveLabels.townRoom.title+' when the game over time ends'
        );
        let townRoomName = await DeathReviveSteps.expectTownGameOverMessage(context, 0);
        await DeathReviveSteps.expectRevivedInTown(context, townRoomName);
    }

    static async runRestorationItemTest(context)
    {
        let restorationItemKey = await DeathReviveSteps.killPlayerWithRestorationItem(
            context,
            {},
            DeathReviveSteps.LONG_RUN_GAME_OVER_TIME_OUT,
            reviveLabels => 'The player died: the '+reviveLabels.itemLabel+' revives it where it died'
        );
        await DeathReviveSteps.expectRevivedInForest(context, restorationItemKey);
    }

    static async runResurrectionAdTest(context)
    {
        await DeathResurrectionAdSteps.playAdAndExpectRevivedInForest(
            context,
            await DeathResurrectionAdSteps.killWithResurrectionAd(context, {}, 0)
        );
    }

    static async runUsedRestorationItemTest(context)
    {
        let restorationItemKey = await DeathReviveSteps.killPlayerAskedForTheItem(context, {});
        await DeathReviveShowcase.showStep(
            context,
            'The player chooses to use the '+context.reviveLabels.itemLabel+': it revives where it died'
        );
        await DeathReviveShowcase.clickButton(context, Selectors.gameOver.restorationItemUseButton);
        await DeathReviveSteps.expectRevivedInForest(context, restorationItemKey);
    }

    static async runKeptRestorationItemTest(context)
    {
        let restorationItemKey = await DeathReviveSteps.killPlayerAskedForTheItem(context, {});
        await DeathReviveShowcase.showStep(
            context,
            'The player keeps the '+context.reviveLabels.itemLabel+': it revives in '
                +context.reviveLabels.townRoom.title
        );
        await DeathReviveShowcase.clickButton(context, Selectors.gameOver.restorationItemKeepButton);
        await expect(
            context.page.locator(Selectors.gameOver.restorationItemKeepButton),
            'The restoration item is not asked once it is kept'
        ).toHaveCount(0);
        let townRoomName = await DeathReviveSteps.expectTownGameOverMessage(context, 0);
        await DeathReviveSteps.expectRevivedInTown(context, townRoomName);
        await DeathReviveSteps.expectRestorationItemQuantity(context, restorationItemKey, 1);
        await DeathReviveShowcase.showKeptItem(context, restorationItemKey);
    }

    static async runManualReviveInPlaceTest(context)
    {
        await DeathReviveSteps.prepareDeath(context, Object.assign(
            {[ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: false},
            DeathReviveSteps.MANUAL_REVIVE_CONFIG
        ));
        await DeathReviveSteps.killPlayerInForest(
            context,
            await DeathReviveSteps.enterForest(context),
            'The player died: without auto revive the Revive button appears when the wait ends'
        );
        await DeathReviveSteps.expectReviveWait(context);
        await DeathReviveSteps.expectGameOverMessage(context, DeathReviveSteps.DEATH_SNIPPETS.reviveInPlace, 0);
        await DeathReviveSteps.requestReviveInForest(context);
        expect(
            await TestCombatDeath.waitForPlayerHpCondition(context.page, 'alive', TimeConstants.PLAYER_REVIVE),
            'The player must revive once it asks for it'
        ).toBe(true);
        expect(await Navigation.getCurrentRoomName(context.page), 'The player must revive where it died').toBe(
            Login.FOREST_ROOM_NAME
        );
        await DeathReviveShowcase.showStep(context, 'The player clicked Revive and revived where it died');
        await LongRunShowcase.pause(context.page, context.longRun);
        await context.screenshots.capture(context.page, 'player-revived-in-forest');
    }

    static async runManualReviveWithRestorationItemTest(context)
    {
        let restorationItemKey = await DeathReviveSteps.killPlayerAskedForTheItem(
            context,
            DeathReviveSteps.MANUAL_REVIVE_CONFIG
        );
        await DeathReviveSteps.expectReviveWait(context);
        await DeathReviveShowcase.showStep(
            context,
            'The player chooses to use the '+context.reviveLabels.itemLabel
                +': the Revive button appears when the wait ends'
        );
        await DeathReviveShowcase.clickButton(context, Selectors.gameOver.restorationItemUseButton);
        await DeathReviveSteps.expectItemReviveMessage(context, restorationItemKey);
        await DeathReviveSteps.requestReviveInForest(context);
        await DeathReviveSteps.expectItemConsumedInForest(context, restorationItemKey);
    }

    static async killBothPlayersInForest(context, secondPlayerConfig)
    {
        let gameConfig = context.gameConfig;
        await DeathReviveSteps.prepareDeath(context, Object.assign(
            {[ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: false},
            DeathReviveSteps.MANUAL_REVIVE_CONFIG
        ));
        test.setTimeout(
            2 * TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, context.longRun)
            + 2 * TimeConstants.ENEMY_KILL
            + 3 * TimeConstants.PLAYER_REVIVE
        );
        await Login.loginAndEnterForest(context.page, gameConfig, context.longRun);
        await Login.loginAndEnterForest(context.secondPage, secondPlayerConfig, context.longRun);
        await TestCombatDeath.killPlayerWithEnemyAttack(
            context.page,
            gameConfig,
            gameConfig.e2eEnemyKey,
            TimeConstants.ENEMY_KILL
        );
        await TestCombatDeath.killPlayerWithEnemyAttack(
            context.secondPage,
            secondPlayerConfig,
            gameConfig.e2eEnemyKey,
            TimeConstants.ENEMY_KILL
        );
        await RoomObjectsApi.disableEnemies(gameConfig, Login.FOREST_ROOM_NAME, true);
    }

    static waitForReviveAnimation(page)
    {
        return page.waitForFunction(
            (animationKey) => window.reldens.getActiveScene().children.list.some(
                child => animationKey === child.texture?.key
            ),
            PlayerReviveDisplay.ANIMATION_KEY,
            {polling: 'raf', timeout: TimeConstants.PLAYER_REVIVE}
        );
    }

    static async revivePlayerAndExpectEveryClient(revivedPage, otherPage)
    {
        let animationsPlayed = Promise.all([
            TestDeathTeleport.waitForReviveAnimation(revivedPage),
            TestDeathTeleport.waitForReviveAnimation(otherPage)
        ]);
        await revivedPage.locator(Selectors.gameOver.reviveButton).click();
        await animationsPlayed;
        expect(
            await TestCombatDeath.waitForPlayerHpCondition(revivedPage, 'alive', TimeConstants.PLAYER_REVIVE),
            'The revived player game over box must close and its life must be restored'
        ).toBe(true);
        await SceneSpritesRecorder.waitForShownPlayer(
            otherPage,
            await revivedPage.evaluate(() => window.reldens.getCurrentPlayer().playerId),
            TimeConstants.PLAYER_REVIVE
        );
    }

    static async runOnlyRevivedPlayerBoxClosesTest(context)
    {
        let gameConfig = context.gameConfig;
        let secondPlayerConfig = Login.fetchSecondPlayerConfig(gameConfig);
        await TestDeathTeleport.killBothPlayersInForest(context, secondPlayerConfig);
        let reviveTimeout = {timeout: TimeConstants.PLAYER_REVIVE};
        await expect(context.page.locator(Selectors.gameOver.reviveButton)).toBeVisible(reviveTimeout);
        await expect(context.secondPage.locator(Selectors.gameOver.reviveButton)).toBeVisible(reviveTimeout);
        await TestDeathTeleport.revivePlayerAndExpectEveryClient(context.page, context.secondPage);
        await expect(
            context.secondPage.locator(Selectors.gameOver.box),
            'The game over box of a player who is still dead must stay open when another player revives'
        ).toBeVisible();
        await expect(context.secondPage.locator(Selectors.gameOver.reviveButton)).toBeVisible();
        let stillDeadPlayer = await GameplayE2eStateApi.fetchPlayer(
            gameConfig,
            Login.FOREST_ROOM_NAME,
            secondPlayerConfig.e2ePlayerName
        );
        expect(stillDeadPlayer.life, 'The other player must stay dead').toBe(0);
        await context.screenshots.capture(context.secondPage, 'still-dead-player-keeps-its-game-over-box');
        await TestDeathTeleport.revivePlayerAndExpectEveryClient(context.secondPage, context.page);
        await expect(context.page.locator(Selectors.gameOver.box)).toBeHidden();
        await context.screenshots.capture(context.page, 'every-client-shows-the-revived-players');
    }

    static run()
    {
        test.describe('Death Teleport', () => {
            test('a revive closes only the game over box of the revived player and every client shows it', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathTeleport.runOnlyRevivedPlayerBoxClosesTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('dead player revives in the town room with the death teleport enabled', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathTeleport.runTownReviveTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('dead player with the restoration item revives where it died and consumes the item', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathTeleport.runRestorationItemTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('resurrection ad rewards the restoration item that revives the dead player where it died', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathTeleport.runResurrectionAdTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('dead player chooses to use the restoration item and revives where it died', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathTeleport.runUsedRestorationItemTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('dead player chooses to keep the restoration item and revives in the town room', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathTeleport.runKeptRestorationItemTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('dead player without auto revive asks for the revive where it died once the wait passed', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathTeleport.runManualReviveInPlaceTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('dead player without auto revive uses the restoration item and asks for the revive', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathTeleport.runManualReviveWithRestorationItemTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
        });
    }

}

TestDeathTeleport.run();
