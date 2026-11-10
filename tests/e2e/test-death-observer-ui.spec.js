/**
 *
 * Reldens - Test Death Observer UI
 *
 * Tests the interface of the clients around a player death in the forest (the aggressive enemies are disabled first and
 * the player is killed by the other enemy of the configured enemy respawn layer, TestCombatDeath, the death teleport is
 * off unless the case needs the town revive): the second client that targeted the first player (the life bar is shown
 * on click, the target is set by the same client method the sprite click calls) loses that player life bar when it
 * dies, and targeting it again after its revive in place shows its full
 * life; the second client with the forest quest NPC dialog open keeps that dialog, its position and its target while
 * the first player revives in place; and the first player that dies with that dialog open revives in the town room with
 * the dialog closed by the scene change.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { DeathReviveSteps } = require('./helpers/death-revive-steps');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { TestCombatDeath } = require('./helpers/test-combat-death');
const { Phaser } = require('./helpers/phaser');
const { LifeBarState } = require('./helpers/life-bar-state');
const { ObserverSteps } = require('./helpers/observer-steps');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ActionsConst } = require('../../lib/actions/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestDeathObserverUi
{

    static TELEPORT_OFF = {[ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: false};

    static async enterForest(context, configValues, withObserver)
    {
        await DeathReviveSteps.prepareDeath(context, configValues);
        test.setTimeout(
            test.info().timeout + TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, context.longRun)
        );
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        await RoomObjectsApi.disableEnemies(context.gameConfig, Login.FOREST_ROOM_NAME, true);
        if(!withObserver){
            return false;
        }
        let observerConfig = Login.fetchSecondPlayerConfig(context.gameConfig);
        await Login.loginAndEnterForest(context.secondPage, observerConfig, context.longRun);
        return await context.page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId);
    }

    static async killFirstPlayer(context)
    {
        await TestCombatDeath.killPlayerAgain(context.page, context.gameConfig, TimeConstants.ENEMY_KILL);
    }

    static async targetFirstPlayer(context, sessionId)
    {
        let placed = await RoomObjectsApi.placePlayerNearPlayer(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            context.gameConfig.e2ePlayerName2,
            context.gameConfig.e2ePlayerName
        );
        expect(placed.position, 'The second player must be placed next to the first one: '+placed.error).toBeTruthy();
        await Phaser.waitForPlayerBySessionId(context.secondPage, sessionId, TimeConstants.SCENE_LOAD);
        await context.secondPage.evaluate(
            (targetSessionId) => window.reldens.getCurrentPlayer().setTargetPlayerById(targetSessionId),
            sessionId
        );
        await expect.poll(
            async () => (await LifeBarState.fetchPlayerBar(context.secondPage, sessionId)).isDrawn,
            {message: 'The targeted player life bar is shown', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(true);
    }

    static async fetchObserverState(page)
    {
        return await page.evaluate(() => {
            let room = window.reldens.activeRoomEvents.room;
            let playerState = window.reldens.activeRoomEvents.playerBySessionIdFromState(room, room.sessionId);
            return {
                x: playerState.state.x,
                y: playerState.state.y,
                targetId: (window.reldens.getCurrentPlayer().currentTarget || {}).id || false
            };
        });
    }

    static async runLifeBarRemovedTest(context)
    {
        let sessionId = await TestDeathObserverUi.enterForest(context, TestDeathObserverUi.TELEPORT_OFF, true);
        await TestDeathObserverUi.targetFirstPlayer(context, sessionId);
        await TestDeathObserverUi.killFirstPlayer(context);
        await expect.poll(
            async () => (await LifeBarState.fetchPlayerBar(context.secondPage, sessionId)).isDrawn,
            {message: 'The dead player life bar is removed', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(false);
    }

    static async runFullLifeBarAfterReviveTest(context)
    {
        let sessionId = await TestDeathObserverUi.enterForest(context, TestDeathObserverUi.TELEPORT_OFF, true);
        await TestDeathObserverUi.targetFirstPlayer(context, sessionId);
        await TestDeathObserverUi.killFirstPlayer(context);
        await DeathReviveSteps.expectAliveInForest(context);
        await TestDeathObserverUi.targetFirstPlayer(context, sessionId);
        let lifeBar = await LifeBarState.fetchPlayerBar(context.secondPage, sessionId);
        expect(lifeBar.value, 'The revived player life bar is full').toBe(lifeBar.total);
    }

    static async runObserverDialogKeptTest(context)
    {
        await TestDeathObserverUi.enterForest(context, TestDeathObserverUi.TELEPORT_OFF, true);
        let observerConfig = Login.fetchSecondPlayerConfig(context.gameConfig);
        await ObserverSteps.openQuestNpcDialog(context.secondPage, observerConfig);
        let observerBefore = await TestDeathObserverUi.fetchObserverState(context.secondPage);
        await TestDeathObserverUi.killFirstPlayer(context);
        await DeathReviveSteps.expectAliveInForest(context);
        await expect(
            context.secondPage.locator(Selectors.npc.dialogue).filter({visible: true}),
            'The second client keeps its NPC dialog'
        ).not.toHaveCount(0);
        expect(
            await TestDeathObserverUi.fetchObserverState(context.secondPage),
            'The second client keeps its position and target'
        ).toEqual(observerBefore);
    }

    static async runDialogClosedByTownReviveTest(context)
    {
        await TestDeathObserverUi.enterForest(context, {}, false);
        await ObserverSteps.openQuestNpcDialog(context.page, context.gameConfig);
        await TestDeathObserverUi.killFirstPlayer(context);
        await DeathReviveSteps.expectRevivedInTown(context, await DeathReviveSteps.expectTownGameOverMessage(context, 0));
        await expect(
            context.page.locator(Selectors.npc.dialogue).filter({visible: true}),
            'The forest NPC dialog is closed in the town room'
        ).toHaveCount(0);
    }

    static run()
    {
        test.describe('Death Observer UI', () => {
            test('dead player life bar shown on click is removed on the other client', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathObserverUi.runLifeBarRemovedTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('revived player clicked again shows its full life bar on the other client', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathObserverUi.runFullLifeBarAfterReviveTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('other client keeps its NPC dialog, position and target while the dead player revives', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathObserverUi.runObserverDialogKeptTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('dead player with an NPC dialog open revives in town with the dialog closed', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathObserverUi.runDialogClosedByTownReviveTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
        });
    }

}

TestDeathObserverUi.run();
