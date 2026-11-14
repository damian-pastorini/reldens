/**
 *
 * Reldens - Test Death Other Clients
 *
 * Tests what every client shows when a player dies and revives (DeathReviveSteps kills the first player in the forest
 * with a real enemy hit, the second player observes from the forest or from the town): the death broadcast hides the
 * dead player sprite and name on the other client and clears it as its target, the other client game over box stays
 * hidden and gets no revive message; a revive in place plays the revive animation on the revived player sprite of every
 * client (not moved by the player offsets); a town revive plays no animation away from the revived player sprite, the
 * revive only reaches the dead player while the other client in the forest gets the player removed and keeps its scene
 * visible, and a client already in the town sees the revived player arrive; a revive in the room the player died in
 * (the forest set as the teleport room) shows the player again on the room return point to the other client; after the
 * town revive the dead player sees its box hidden, its full life, its own sprite and can walk; and a client joining the
 * room while a player is dead shows that player once it revives.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { DeathReviveSteps } = require('./helpers/death-revive-steps');
const { SceneSpritesRecorder } = require('./helpers/scene-sprites-recorder');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { CombatSkillCasting } = require('./helpers/combat-skill-casting');
const { TestCombatDeath } = require('./helpers/test-combat-death');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { ForestEnemyKill } = require('./helpers/forest-enemy-kill');
const { Navigation } = require('./helpers/navigation');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ActionsConst } = require('../../lib/actions/constants');
const { GameConst } = require('../../lib/game/constants');
const { PlayerReviveDisplay } = require('../../lib/game/client/player-revive-display');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestDeathOtherClients
{

    static TELEPORT_OFF = {[ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: false};
    static WALK_MS = 600;

    static async fetchSessionId(page)
    {
        return await page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId);
    }

    static async loginPlayers(context, configValues, observerInForest)
    {
        await DeathReviveSteps.prepareDeath(context, configValues);
        test.setTimeout(
            test.info().timeout + TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, context.longRun)
        );
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        if(observerInForest){
            await Login.loginAndEnterForest(
                context.secondPage,
                Login.fetchSecondPlayerConfig(context.gameConfig),
                context.longRun
            );
            return await TestDeathOtherClients.fetchSessionId(context.page);
        }
        await Login.loginRootPlayer(context.secondPage, context.gameConfig, context.longRun, '2');
        return await TestDeathOtherClients.fetchSessionId(context.page);
    }

    static async killFirstPlayer(context)
    {
        await SceneSpritesRecorder.start(context.page);
        await RoomMessagesRecorder.start(context.secondPage);
        await DeathReviveSteps.killPlayerInForest(context, {}, 'The first player died');
    }

    static async expectReviveOnSprite(page, sessionId)
    {
        let sprite = await SceneSpritesRecorder.fetchPlayerSprite(page, sessionId);
        expect(
            (await SceneSpritesRecorder.fetchSprites(page, PlayerReviveDisplay.ANIMATION_KEY)).map(
                reviveSprite => [reviveSprite.x, reviveSprite.y]
            ),
            'One revive animation on the revived player sprite'
        ).toEqual([[sprite.x, sprite.y]]);
    }

    static async runDeathBroadcastTest(context)
    {
        let sessionId = await TestDeathOtherClients.loginPlayers(context, TestDeathOtherClients.TELEPORT_OFF, true);
        await CombatSkillCasting.targetPlayer(context.secondPage, sessionId);
        await TestDeathOtherClients.killFirstPlayer(context);
        let deadSprite = await SceneSpritesRecorder.fetchPlayerSprite(context.secondPage, sessionId);
        expect([deadSprite.visible, deadSprite.nameVisible], 'The dead player and its name are hidden').toEqual(
            [false, false]
        );
        expect(
            await context.secondPage.evaluate(() => window.reldens.getActiveScene().player.currentTarget?.id || ''),
            'The dead player is no longer the target'
        ).not.toBe(sessionId);
        await expect(context.secondPage.locator(Selectors.gameOver.box), 'The other box stays hidden').toBeHidden();
        expect(
            await RoomMessagesRecorder.fetchMessages(context.secondPage, ActionsConst.DEATH.ACTIONS.REVIVE_MESSAGE),
            'The other player gets no revive message'
        ).toEqual([]);
        await context.screenshots.capture(context.secondPage, 'dead-player-hidden-on-the-other-client');
    }

    static async runReviveInPlaceAnimationTest(context)
    {
        let sessionId = await TestDeathOtherClients.loginPlayers(context, TestDeathOtherClients.TELEPORT_OFF, true);
        await SceneSpritesRecorder.start(context.secondPage);
        await TestDeathOtherClients.killFirstPlayer(context);
        expect(
            await TestCombatDeath.waitForPlayerHpCondition(context.page, 'alive', TimeConstants.PLAYER_REVIVE),
            'The player revives'
        ).toBe(true);
        await SceneSpritesRecorder.waitForShownPlayer(context.secondPage, sessionId, TimeConstants.PLAYER_REVIVE);
        await TestDeathOtherClients.expectReviveOnSprite(context.page, sessionId);
        await TestDeathOtherClients.expectReviveOnSprite(context.secondPage, sessionId);
        await context.screenshots.capture(context.secondPage, 'revive-animation-on-the-player');
    }

    static async runTownReviveSeenFromForestTest(context)
    {
        let sessionId = await TestDeathOtherClients.loginPlayers(context, {}, true);
        await TestDeathOtherClients.killFirstPlayer(context);
        let deadSprite = await SceneSpritesRecorder.fetchPlayerSprite(context.page, sessionId);
        let townRoomName = (await DeathReviveSteps.fetchReviveLabels(context.gameConfig)).townRoom.name;
        await DeathReviveSteps.expectRevivedInTown(context, townRoomName);
        expect(
            (await SceneSpritesRecorder.fetchSprites(context.page, PlayerReviveDisplay.ANIMATION_KEY)).filter(
                reviveSprite => reviveSprite.x !== deadSprite.x || reviveSprite.y !== deadSprite.y
            ),
            'No revive animation away from the revived player sprite'
        ).toEqual([]);
        await SceneSpritesRecorder.waitForRemovedPlayer(context.secondPage, sessionId, TimeConstants.PLAYER_REVIVE);
        expect(
            await RoomMessagesRecorder.fetchMessages(context.secondPage, GameConst.REVIVED),
            'The town revive only reaches the dead player'
        ).toEqual([]);
        expect(
            await context.secondPage.evaluate(() => window.reldens.getActiveScene().sys.settings.visible),
            'The other client scene stays visible'
        ).toBe(true);
        await context.screenshots.capture(context.secondPage, 'forest-after-the-town-revive');
    }

    static async runRevivedArrivesInTownTest(context)
    {
        await TestDeathOtherClients.loginPlayers(context, {}, false);
        await TestDeathOtherClients.killFirstPlayer(context);
        let townRoomName = (await DeathReviveSteps.fetchReviveLabels(context.gameConfig)).townRoom.name;
        await DeathReviveSteps.expectRevivedInTown(context, townRoomName);
        await SceneSpritesRecorder.waitForShownPlayer(
            context.secondPage,
            await TestDeathOtherClients.fetchSessionId(context.page),
            TimeConstants.PLAYER_REVIVE
        );
        await context.screenshots.capture(context.secondPage, 'revived-player-arrives-in-town');
    }

    static async runSameRoomTownReviveTest(context)
    {
        let forestRoom = [...await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'rooms', {
            name: Login.FOREST_ROOM_NAME
        })].shift();
        let sessionId = await TestDeathOtherClients.loginPlayers(
            context,
            {[ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ROOM_ID]: Number(forestRoom.id)},
            true
        );
        await TestDeathOtherClients.killFirstPlayer(context);
        let revivedPlayer = await DeathReviveSteps.expectAliveInForest(context);
        await SceneSpritesRecorder.waitForShownPlayer(context.secondPage, sessionId, TimeConstants.PLAYER_REVIVE);
        let returnPoint = [...await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'roomsReturnPoints', {
            room_id: forestRoom.id,
            is_default: 1
        })].shift();
        expect(
            Math.hypot(revivedPlayer.x - Number(returnPoint.x), revivedPlayer.y - Number(returnPoint.y)),
            'Revived on the return point (the other player standing there can push it)'
        ).toBeLessThan(Navigation.TILE_SIZE);
        let offsets = await context.secondPage.evaluate(() => ({
            left: window.reldens.config.get('client/players/size/leftOffset'),
            top: window.reldens.config.get('client/players/size/topOffset')
        }));
        await expect.poll(
            async () => [await Promise.all([
                DeathReviveSteps.fetchPlayer(context, Login.FOREST_ROOM_NAME),
                SceneSpritesRecorder.fetchPlayerSprite(context.secondPage, sessionId)
            ])].map(([serverPlayer, shownSprite]) => [
                Math.round(shownSprite.x - (serverPlayer.x - offsets.left)),
                Math.round(shownSprite.y - (serverPlayer.y - offsets.top))
            ]).shift(),
            {message: 'The other client shows the player where it reappeared', timeout: TimeConstants.PLAYER_REVIVE}
        ).toEqual([0, 0]);
        await context.screenshots.capture(context.secondPage, 'player-shown-on-the-return-point');
    }

    static async runAfterTownReviveTest(context)
    {
        await DeathReviveSteps.killPlayerCarryingItems(context, {}, 0);
        let townRoomName = (await DeathReviveSteps.fetchReviveLabels(context.gameConfig)).townRoom.name;
        await DeathReviveSteps.expectRevivedInTown(context, townRoomName);
        await expect(context.page.locator(Selectors.gameOver.box), 'The game over box is hidden').toBeHidden();
        let townPlayer = await DeathReviveSteps.fetchPlayer(context, townRoomName);
        expect((await ForestEnemyKill.fetchClientLife(context.page)).value, 'The HUD shows the full life').toBe(
            townPlayer.life
        );
        expect(townPlayer.life, 'Full life').toBe(townPlayer.totalLife);
        let ownSessionId = await TestDeathOtherClients.fetchSessionId(context.page);
        expect((await SceneSpritesRecorder.fetchPlayerSprite(context.page, ownSessionId)).visible).toBe(true);
        await Navigation.walkInDirection(context.page, 'ArrowDown', TestDeathOtherClients.WALK_MS);
        let walkedPlayer = await DeathReviveSteps.fetchPlayer(context, townRoomName);
        expect([walkedPlayer.x, walkedPlayer.y], 'The revived player can walk').not.toEqual(
            [townPlayer.x, townPlayer.y]
        );
    }

    static async runClosedTabTest(context)
    {
        let sessionId = await TestDeathOtherClients.loginPlayers(context, TestDeathOtherClients.TELEPORT_OFF, true);
        await SceneSpritesRecorder.start(context.secondPage);
        await TestDeathOtherClients.killFirstPlayer(context);
        await context.page.goto('about:blank');
        await SceneSpritesRecorder.waitForRemovedPlayer(context.secondPage, sessionId, TimeConstants.PLAYER_REVIVE);
        await context.secondPage.waitForTimeout(context.gameOverTimeOut + TestDeathOtherClients.WALK_MS);
        expect(
            await RoomMessagesRecorder.fetchMessages(context.secondPage, GameConst.REVIVED),
            'No revive of the player that left'
        ).toEqual([]);
        expect(
            await SceneSpritesRecorder.fetchSprites(context.secondPage, PlayerReviveDisplay.ANIMATION_KEY),
            'No revive animation of the player that left'
        ).toEqual([]);
    }

    static async runJoinWhileDeadTest(context)
    {
        await DeathReviveSteps.prepareDeath(
            context,
            Object.assign({}, TestDeathOtherClients.TELEPORT_OFF, DeathReviveSteps.MANUAL_REVIVE_CONFIG)
        );
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        let sessionId = await TestDeathOtherClients.fetchSessionId(context.page);
        await DeathReviveSteps.killPlayerInForest(context, {}, 'The first player died');
        await Login.loginAndEnterForest(
            context.secondPage,
            Login.fetchSecondPlayerConfig(context.gameConfig),
            context.longRun
        );
        await context.screenshots.capture(context.secondPage, 'joined-while-the-player-is-dead');
        await DeathReviveSteps.requestReviveInForest(context);
        await DeathReviveSteps.expectAliveInForest(context);
        await SceneSpritesRecorder.waitForShownPlayer(context.secondPage, sessionId, TimeConstants.PLAYER_REVIVE);
    }

    static run()
    {
        test.describe('Death Other Clients', () => {
            test('death hides the dead player and clears it as target on the other client, whose box stays hidden', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathOtherClients.runDeathBroadcastTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('revive in place plays the revive animation on the revived player sprite of every client', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathOtherClients.runReviveInPlaceAnimationTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('town revive only reaches the dead player and the forest client removes it', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathOtherClients.runTownReviveSeenFromForestTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('client in the town sees the revived player arrive', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathOtherClients.runRevivedArrivesInTownTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('revive in the room where the player died shows it on the return point to the other client', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathOtherClients.runSameRoomTownReviveTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('after the town revive the box is hidden, the life is full and the player can walk', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathOtherClients.runAfterTownReviveTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('dead player that closes its tab is removed with no late revive on the other client', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathOtherClients.runClosedTabTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('client joining while a player is dead shows it once it revives', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathOtherClients.runJoinWhileDeadTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
        });
    }

}

TestDeathOtherClients.run();
