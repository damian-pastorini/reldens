/**
 *
 * Reldens - Test Client Interpolation States
 *
 * Tests the client interpolation of a player whose state changes in the middle of a walk (exclusive group, two players
 * in the town with the town moving objects paused, the second player placed next to the town NPC so the first one
 * stands alone on the return point): the first player walks a long pointer path on a clear line of tiles and, once its
 * sprite moves on both clients, its page closes (the other client removes its sprite and its interpolation never
 * throws, the entry is kept, ISSUE #347) or the server sets it disabled or dead. On its own client and on the
 * other client the interpolation entry of that player is deleted (the update reads the dead or disabled state and ends
 * the entry without moving the sprite) and its sprite stays on the same position for the next frames.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { TeamSteps } = require('./helpers/team-steps');
const { WalkObserverSetup } = require('./helpers/walk-observer-setup');
const { RoomMovementApi } = require('./helpers/room-movement-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { InterpolationFramesRecorder } = require('./helpers/interpolation-frames-recorder');
const { TimeConstants } = require('./helpers/time-constants');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestClientInterpolationStates
{

    static LONG_WALK_DISTANCES = [12, 10, 8, 6];
    static STILL_FRAMES = 10;
    static READ_WALKER = (sessionId) => [window.reldens.getActiveScene()].map((scene) => ({
        inState: window.reldens.activeRoomEvents.room.state.players.get(sessionId)?.state?.inState,
        hasEntry: sessionId in scene.interpolatePlayersPosition,
        sprite: [scene.player.players[sessionId]].map((sprite) => sprite ? [sprite.x, sprite.y] : false).pop()
    })).pop();
    static WAIT_FRAMES = (framesCount) => new Promise((resolve) => {
        let scene = window.reldens.getActiveScene();
        let frames = 0;
        let onPostUpdate = () => {
            frames++;
            if(framesCount > frames){
                return;
            }
            scene.events.off('postupdate', onPostUpdate);
            resolve(frames);
        };
        scene.events.on('postupdate', onPostUpdate);
    });

    static async startLongWalk(context, walker, observer)
    {
        let walkContext = await WalkObserverSetup.placeWalkerAlone(context, walker, observer);
        let targetTile = await RoomMovementApi.fetchClearLineTile(
            context.gameConfig,
            Login.TOWN_ROOM_NAME,
            walker.playerName,
            TestClientInterpolationStates.LONG_WALK_DISTANCES
        );
        expect(targetTile, 'A long clear line of tiles starts on the player').toBeTruthy();
        await RoomMessagesRecorder.sendMessage(walker.page, {
            act: GameConst.POINTER,
            column: targetTile[0],
            row: targetTile[1]
        });
        return walkContext;
    }

    static async startWalkSeenByEveryClient(context)
    {
        let players = await TeamSteps.enterPlayers(context, 2);
        let walker = players[0];
        let walkContext = await TestClientInterpolationStates.startLongWalk(context, walker, players[1]);
        let pages = players.map((player) => player.page);
        for(let page of pages){
            let joined = await page.evaluate(TestClientInterpolationStates.READ_WALKER, walker.sessionId);
            await expect.poll(
                async () => (await page.evaluate(TestClientInterpolationStates.READ_WALKER, walker.sessionId)).sprite,
                {message: 'Every client shows the player walking', timeout: TimeConstants.SERVER_RESPONSE}
            ).not.toEqual(joined.sprite);
        }
        expect((await walkContext.fetchPlayer()).pathSteps, 'The player still walks its path').toBeGreaterThan(0);
        return {players, walker, pages};
    }

    static async runLeaveDuringWalkTest(context)
    {
        let walking = await TestClientInterpolationStates.startWalkSeenByEveryClient(context);
        let observerPage = walking.players[1].page;
        let pageErrors = InterpolationFramesRecorder.trackPageErrors(observerPage);
        await walking.walker.page.goto('about:blank');
        await expect.poll(
            async () => (await observerPage.evaluate(TestClientInterpolationStates.READ_WALKER, walking.walker.sessionId)).sprite,
            {message: 'The other client removes the sprite of the player that left', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(false);
        await observerPage.evaluate(TestClientInterpolationStates.WAIT_FRAMES, TestClientInterpolationStates.STILL_FRAMES);
        expect(pageErrors, 'The other client never throws on the interpolation of the removed player').toEqual([]);
    }

    static async runStateDuringWalkTest(context, inState)
    {
        let walking = await TestClientInterpolationStates.startWalkSeenByEveryClient(context);
        let walker = walking.walker;
        let pages = walking.pages;
        let changed = await GameplayE2eStateApi.setPlayerState(
            context.gameConfig,
            Login.TOWN_ROOM_NAME,
            walker.playerName,
            inState
        );
        expect(changed.inState, 'The server sets the walking player state: '+changed.error).toBe(inState);
        for(let page of pages){
            await expect.poll(
                async () => [await page.evaluate(TestClientInterpolationStates.READ_WALKER, walker.sessionId)].map(
                    (walkerView) => [walkerView.inState, walkerView.hasEntry]
                ).pop(),
                {message: 'Every client ends the interpolation entry of the player', timeout: TimeConstants.SERVER_RESPONSE}
            ).toEqual([inState, false]);
            let stopped = await page.evaluate(TestClientInterpolationStates.READ_WALKER, walker.sessionId);
            await page.evaluate(TestClientInterpolationStates.WAIT_FRAMES, TestClientInterpolationStates.STILL_FRAMES);
            expect(
                await page.evaluate(TestClientInterpolationStates.READ_WALKER, walker.sessionId),
                'The sprite of the player stays still with no interpolation entry'
            ).toEqual(stopped);
        }
    }

    static run()
    {
        test.describe('Client Interpolation States', () => {
            test('a player leaving while walking is removed from the other client without errors', async ({ page, secondPage, gameConfig, longRun }) => {
                await TestClientInterpolationStates.runLeaveDuringWalkTest({page, secondPage, gameConfig, longRun});
            });
            test('a player disabled while walking ends its interpolation and stops its sprite on every client', async ({ page, secondPage, gameConfig, longRun }) => {
                await TestClientInterpolationStates.runStateDuringWalkTest(
                    {page, secondPage, gameConfig, longRun},
                    GameConst.STATUS.DISABLED
                );
            });
            test('a player dead while walking ends its interpolation and stops its sprite on every client', async ({ page, secondPage, gameConfig, longRun }) => {
                await TestClientInterpolationStates.runStateDuringWalkTest(
                    {page, secondPage, gameConfig, longRun},
                    GameConst.STATUS.DEATH
                );
            });
        });
    }

}

TestClientInterpolationStates.run();
