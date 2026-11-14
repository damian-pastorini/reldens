/**
 *
 * Reldens - Test Client Interpolation Disabled
 *
 * Tests the sprites placed directly on their state with the client interpolation disabled (exclusive group, the
 * client/general/engine/clientInterpolation config overridden for the group and restored by the next players reset):
 * every frame that moves a tracked sprite (recorded after the scene update) leaves it exactly on its state position
 * (a player with the players size offsets) and the scene never keeps an interpolation entry. The tracked sprites are
 * another player walking a clear line as the observer client sees it (WalkObserverSetup), the town NPC placed next to
 * its original tile and walking back (ObjectInterpolationSteps) and the bullet the first player shoots at a forest
 * enemy as the observer client sees it (BulletObserverSetup).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { TeamSteps } = require('./helpers/team-steps');
const { WalkObserverSetup } = require('./helpers/walk-observer-setup');
const { BulletObserverSetup } = require('./helpers/bullet-observer-setup');
const { ObjectInterpolationSteps } = require('./helpers/object-interpolation-steps');
const { MovementScenario } = require('./helpers/movement-scenario');
const { RoomMovementApi } = require('./helpers/room-movement-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { InterpolationFramesRecorder } = require('./helpers/interpolation-frames-recorder');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestClientInterpolationDisabled
{

    static CLIENT_INTERPOLATION_PATH = 'client/general/engine/clientInterpolation';
    static WALK_DISTANCES = [4, 3, 2];
    static BULLET_SKILL_KEY = 'attackBullet';
    static RECORD_DIRECT = (tracked) => {
        let scene = window.reldens.getActiveScene();
        let room = window.reldens.activeRoomEvents.room;
        let objectsPlugin = window.reldens.getFeature('objects');
        let recorder = {scene, frames: [], last: {}};
        let readPosition = (positionSource, offsets) => positionSource
            ? [positionSource.x - offsets[0], positionSource.y - offsets[1]]
            : false;
        let readTargets = () => [
            ...tracked.players.map((key) => ({
                kind: 'player',
                key,
                position: readPosition(scene.player.players[key], [0, 0]),
                target: readPosition(room.state.players.get(key)?.state, [scene.player.leftOff, scene.player.topOff])
            })),
            ...tracked.objects.map((key) => ({
                kind: 'object',
                key,
                position: readPosition(scene.objectsAnimations[key], [0, 0]),
                target: readPosition(room.state.bodies.get(key), [0, 0])
            })),
            ...(tracked.bullets ? Object.keys(objectsPlugin.bullets) : []).map((key) => ({
                kind: 'bullet',
                key,
                position: readPosition(objectsPlugin.bullets[key], [0, 0]),
                target: readPosition(room.state.bodies.get(key), [0, 0])
            }))
        ];
        recorder.onPostUpdate = () => {
            let entriesCount = Object.keys(scene.interpolatePlayersPosition).length
                + Object.keys(scene.interpolateObjectsPositions).length;
            for(let target of readTargets()){
                let lastPosition = JSON.stringify(recorder.last[target.key]);
                recorder.last[target.key] = target.position;
                if(!target.position || lastPosition === JSON.stringify(target.position)){
                    continue;
                }
                recorder.frames.push({
                    kind: target.kind,
                    isOnState: JSON.stringify(target.position) === JSON.stringify(target.target),
                    entriesCount
                });
            }
        };
        scene.events.on('postupdate', recorder.onPostUpdate);
        window.e2eDirectRecorder = recorder;
    };
    static STOP_DIRECT = () => {
        let recorder = window.e2eDirectRecorder;
        recorder.scene.events.off('postupdate', recorder.onPostUpdate);
        return recorder.frames;
    };

    static async disableInterpolation(context)
    {
        await E2eSeedAndRestoreApi.overrideConfig(
            context.gameConfig,
            context.e2eGroup,
            TestClientInterpolationDisabled.CLIENT_INTERPOLATION_PATH,
            false
        );
    }

    static expectDirectFrames(frames, kind)
    {
        let kindFrames = frames.filter((frame) => kind === frame.kind);
        expect(kindFrames.length, 'The '+kind+' sprite moves on the client').toBeGreaterThan(0);
        expect(
            kindFrames.filter((frame) => !frame.isOnState || 0 < frame.entriesCount),
            'Every '+kind+' frame is placed directly on its state with no interpolation entry'
        ).toEqual([]);
    }

    static async runOtherPlayerTest(context)
    {
        await TestClientInterpolationDisabled.disableInterpolation(context);
        let players = await TeamSteps.enterPlayers(context, 2);
        let walker = players[0];
        let walkContext = await WalkObserverSetup.placeWalkerAlone(context, walker, players[1]);
        let targetTile = await RoomMovementApi.fetchClearLineTile(
            context.gameConfig,
            Login.TOWN_ROOM_NAME,
            walker.playerName,
            TestClientInterpolationDisabled.WALK_DISTANCES
        );
        expect(targetTile, 'A clear line of tiles starts on the walker').toBeTruthy();
        await players[1].page.evaluate(TestClientInterpolationDisabled.RECORD_DIRECT, {
            players: [walker.sessionId],
            objects: [],
            bullets: false
        });
        await RoomMessagesRecorder.sendMessage(walker.page, {act: GameConst.POINTER, column: targetTile[0], row: targetTile[1]});
        let walked = await RoomMovementApi.collectTrail(
            walkContext.fetchPlayer,
            (player) => walkContext.isStill(player) && targetTile[0] === player.currentCol && targetTile[1] === player.currentRow,
            walkContext.navTimeout
        );
        expect(walked.done, 'The walker reaches the line end: '+sc.toJsonString(walked.last)).toBe(true);
        expect(
            await InterpolationFramesRecorder.waitForPlayerSpriteOnState(
                players[1].page,
                walker.sessionId,
                {x: walked.last.x, y: walked.last.y},
                TimeConstants.SERVER_RESPONSE
            ),
            'The observer shows the walker stopped on its server position'
        ).toBe(true);
        TestClientInterpolationDisabled.expectDirectFrames(
            await players[1].page.evaluate(TestClientInterpolationDisabled.STOP_DIRECT),
            'player'
        );
    }

    static async runObjectTest(context)
    {
        await TestClientInterpolationDisabled.disableInterpolation(context);
        let walkContext = await MovementScenario.start(context.page, context.gameConfig, context.longRun);
        let npc = await walkContext.fetchNpc();
        expect(npc, 'The e2eNpcKey object must be in the town room').toBeTruthy();
        await context.page.evaluate(TestClientInterpolationDisabled.RECORD_DIRECT, {
            players: [],
            objects: [walkContext.npcKey],
            bullets: false
        });
        let recorded = await ObjectInterpolationSteps.recordPlacementAndWalkBack(
            context.page,
            context.page,
            walkContext,
            npc,
            context.longRun
        );
        expect(
            [recorded.isPlacementShown, recorded.movement.done, recorded.isWalkShown],
            'The NPC is placed, walks back and its sprite ends on its body'
        ).toEqual([true, true, true]);
        TestClientInterpolationDisabled.expectDirectFrames(
            await context.page.evaluate(TestClientInterpolationDisabled.STOP_DIRECT),
            'object'
        );
    }

    static async runBulletTest(context)
    {
        await TestClientInterpolationDisabled.disableInterpolation(context);
        let entered = await BulletObserverSetup.enterShooterAndObserver(context, false);
        await entered.observer.page.evaluate(TestClientInterpolationDisabled.RECORD_DIRECT, {
            players: [],
            objects: [],
            bullets: true
        });
        await context.page.click(Selectors.combat.skillButton(TestClientInterpolationDisabled.BULLET_SKILL_KEY), {force: true});
        await expect.poll(
            async () => (await entered.observer.page.evaluate(() => window.e2eDirectRecorder.frames.length)),
            {message: 'The observer shows the flying bullet', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBeGreaterThan(0);
        await expect.poll(
            async () => entered.observer.page.evaluate(() => Object.keys(window.reldens.getFeature('objects').bullets).length),
            {message: 'The observer destroys the ended bullet sprite', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(0);
        TestClientInterpolationDisabled.expectDirectFrames(
            await entered.observer.page.evaluate(TestClientInterpolationDisabled.STOP_DIRECT),
            'bullet'
        );
    }

    static run()
    {
        test.describe('Client Interpolation Disabled', () => {
            test('with the interpolation disabled another player sprite is placed directly on every state', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestClientInterpolationDisabled.runOtherPlayerTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('with the interpolation disabled an object sprite is placed directly on every state', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestClientInterpolationDisabled.runObjectTest({page, gameConfig, e2eGroup, longRun});
            });
            test('with the interpolation disabled a bullet sprite is placed directly on every state', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestClientInterpolationDisabled.runBulletTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestClientInterpolationDisabled.run();
