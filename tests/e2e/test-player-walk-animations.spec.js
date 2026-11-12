/**
 *
 * Reldens - Test Player Walk Animations
 *
 * Tests the sprite of a walking player on its own client and on another client of the town (exclusive group, the
 * walker alone on the town return point, WalkObserverSetup): the walker walks a pointer path on a clear line of tiles
 * and every frame of its sprite is recorded on both clients until the sprite stands on the stopped server position.
 * Every frame that moves the sprite plays the walk animation of the line direction (with the sample basedOnPress on,
 * the animation of the state direction; with basedOnPress off it plays a vertical animation, ISSUE #348; the last move
 * places the sprite on the stopped state and stops it in the same
 * frame), the stopped sprite ends with its animation stopped, the name sprite keeps
 * the same position relative to the player sprite on every frame and the sprite depth is its Y plus its body height,
 * and the walker own camera moves in the walk direction.
 * A heal potion used while the own player walks a clear line (its life lowered first) plays its item animation
 * attached to the player sprite, which follows the player sprite on every recorded frame. The own player walking with
 * the right and down keys held (the sample allows simultaneous keys) steps its sprite on both axes in the same frame.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { TeamSteps } = require('./helpers/team-steps');
const { WalkObserverSetup } = require('./helpers/walk-observer-setup');
const { RoomMovementApi } = require('./helpers/room-movement-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { InterpolationFramesRecorder } = require('./helpers/interpolation-frames-recorder');
const { InitialClientConfig } = require('./helpers/initial-client-config');
const { MovementScenario } = require('./helpers/movement-scenario');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { InventoryConst } = require('../../lib/inventory/constants');
const { TimeConstants } = require('./helpers/time-constants');
const { GameConst } = require('../../lib/game/constants');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestPlayerWalkAnimations
{

    static WALK_DISTANCES = [4, 3, 2];
    static DIAGONAL_WALK_MS = 400;
    static RECORD_SPRITE = (sessionId) => {
        let scene = window.reldens.getActiveScene();
        let recorder = {scene, frames: []};
        recorder.onPostUpdate = () => {
            let sprite = scene.player.players[sessionId];
            if(!sprite){
                return;
            }
            recorder.frames.push({
                position: [sprite.x, sprite.y],
                animation: sprite.anims.currentAnim ? sprite.anims.currentAnim.key : false,
                isPlaying: sprite.anims.isPlaying,
                avatar: window.reldens.mappedAvatars[sprite.avatarKey],
                nameOffset: sprite.nameSprite
                    ? [Math.round(sprite.nameSprite.x - sprite.x), Math.round(sprite.nameSprite.y - sprite.y)]
                    : false,
                isDepthByY: sprite.depth === sprite.y + sprite.body.height,
                cameraCenter: [scene.cameras.main.worldView.centerX, scene.cameras.main.worldView.centerY]
            });
        };
        scene.events.on('postupdate', recorder.onPostUpdate);
        window.e2eSpriteRecorder = recorder;
    };
    static RECORD_ATTACHED = () => {
        let scene = window.reldens.getActiveScene();
        let recorder = {scene, frames: []};
        recorder.onPostUpdate = () => {
            let sprite = scene.player.players[window.reldens.activeRoomEvents.room.sessionId];
            for(let attachedKey of Object.keys(sprite.moveSprites)){
                let attachedSprite = sprite.moveSprites[attachedKey];
                recorder.frames.push({player: [sprite.x, sprite.y], attached: [attachedSprite.x, attachedSprite.y]});
            }
        };
        scene.events.on('postupdate', recorder.onPostUpdate);
        window.e2eSpriteRecorder = recorder;
    };
    static STOP_SPRITE = () => {
        let recorder = window.e2eSpriteRecorder;
        recorder.scene.events.off('postupdate', recorder.onPostUpdate);
        return recorder.frames;
    };

    static lineDirection(fromTile, toTile)
    {
        let direction = toTile[1] > fromTile[1] ? GameConst.DOWN : GameConst.UP;
        if(fromTile[0] !== toTile[0]){
            direction = toTile[0] > fromTile[0] ? GameConst.RIGHT : GameConst.LEFT;
        }
        return direction;
    }

    static async recordWalk(context, animationsOptions)
    {
        for(let clientPage of [context.page, context.secondPage]){
            await InitialClientConfig.overrideBeforeEngine(clientPage, 'client/players/animations', animationsOptions);
        }
        let players = await TeamSteps.enterPlayers(context, 2);
        let walker = players[0];
        let walkContext = await WalkObserverSetup.placeWalkerAlone(context, walker, players[1]);
        let start = await walkContext.fetchPlayer();
        let targetTile = await RoomMovementApi.fetchClearLineTile(
            context.gameConfig,
            Login.TOWN_ROOM_NAME,
            walker.playerName,
            TestPlayerWalkAnimations.WALK_DISTANCES
        );
        expect(targetTile, 'A clear line of tiles starts on the walker').toBeTruthy();
        for(let player of players){
            await player.page.evaluate(TestPlayerWalkAnimations.RECORD_SPRITE, walker.sessionId);
        }
        await RoomMessagesRecorder.sendMessage(walker.page, {act: GameConst.POINTER, column: targetTile[0], row: targetTile[1]});
        let walked = await RoomMovementApi.collectTrail(
            walkContext.fetchPlayer,
            (player) => walkContext.isStill(player) && targetTile[0] === player.currentCol && targetTile[1] === player.currentRow,
            walkContext.navTimeout
        );
        expect(walked.done, 'The walker reaches the line end: '+sc.toJsonString(walked.last)).toBe(true);
        let recordings = [];
        for(let player of players){
            expect(
                await InterpolationFramesRecorder.waitForPlayerSpriteOnState(
                    player.page,
                    walker.sessionId,
                    {x: walked.last.x, y: walked.last.y},
                    TimeConstants.SERVER_RESPONSE
                ),
                'Every client shows the walker stopped on its server position'
            ).toBe(true);
            recordings.push(await player.page.evaluate(TestPlayerWalkAnimations.STOP_SPRITE));
        }
        return {recordings, direction: TestPlayerWalkAnimations.lineDirection([start.currentCol, start.currentRow], targetTile)};
    }

    static expectWalkFrames(frames, direction)
    {
        let movingFrames = frames.filter(
            (frame, index) => 0 < index && sc.toJsonString(frame.position) !== sc.toJsonString(frames[index - 1].position)
        );
        expect(movingFrames.length, 'The sprite moves on the client').toBeGreaterThan(0);
        expect(
            [...new Set(movingFrames.map(
                (frame, index) => frame.animation+':'+(frame.isPlaying || index === movingFrames.length - 1)
            ))],
            'Every moving frame plays the walk animation of the line direction, the stop placement ends it'
        ).toEqual([movingFrames[0].avatar+'_'+direction+':true']);
        expect(frames[frames.length - 1].isPlaying, 'The stopped sprite ends with its animation stopped').toBe(false);
        expect(
            [...new Set(frames.map((frame) => sc.toJsonString(frame.nameOffset)))].length,
            'The name sprite keeps its position relative to the player sprite'
        ).toBe(1);
        expect(frames.every((frame) => frame.isDepthByY), 'The sprite depth is its Y plus its body height').toBe(true);
    }

    static async runWalkAnimationTest(context, animationsOptions)
    {
        let walk = await TestPlayerWalkAnimations.recordWalk(context, animationsOptions);
        for(let frames of walk.recordings){
            TestPlayerWalkAnimations.expectWalkFrames(frames, walk.direction);
        }
        let ownFrames = walk.recordings[0];
        let axis = -1 !== [GameConst.LEFT, GameConst.RIGHT].indexOf(walk.direction) ? 0 : 1;
        expect(
            Math.sign(ownFrames[ownFrames.length - 1].cameraCenter[axis] - ownFrames[0].cameraCenter[axis]),
            'The walker camera follows the walk direction'
        ).toBe(-1 !== [GameConst.RIGHT, GameConst.DOWN].indexOf(walk.direction) ? 1 : -1);
    }

    static async runAttachedSpriteTest(context)
    {
        let gameConfig = context.gameConfig;
        let walkContext = await MovementScenario.enterReadyRoom(context, Login.TOWN_ROOM_NAME);
        await MovementScenario.placePlayerOnReturnPoint(context.page, walkContext);
        let player = await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.TOWN_ROOM_NAME, walkContext.playerName);
        await RoomObjectsApi.setPlayerAffectedProperty(
            gameConfig,
            Login.TOWN_ROOM_NAME,
            walkContext.playerName,
            Math.floor(player.totalLife / 2)
        );
        let targetTile = await RoomMovementApi.fetchClearLineTile(
            gameConfig,
            Login.TOWN_ROOM_NAME,
            walkContext.playerName,
            TestPlayerWalkAnimations.WALK_DISTANCES
        );
        expect(targetTile, 'A clear line of tiles starts on the player').toBeTruthy();
        await context.page.evaluate(TestPlayerWalkAnimations.RECORD_ATTACHED);
        await RoomMessagesRecorder.sendMessage(context.page, {act: GameConst.POINTER, column: targetTile[0], row: targetTile[1]});
        await expect.poll(
            async () => (await walkContext.fetchPlayer()).pathSteps,
            {message: 'The player walks its path', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBeGreaterThan(0);
        await RoomMessagesRecorder.sendMessage(context.page, {act: InventoryConst.ACTIONS.USE, idx: gameConfig.e2eConsumableItemId});
        let walked = await RoomMovementApi.collectTrail(
            walkContext.fetchPlayer,
            (snapshot) => walkContext.isStill(snapshot) && targetTile[0] === snapshot.currentCol && targetTile[1] === snapshot.currentRow,
            walkContext.navTimeout
        );
        expect(walked.done, 'The player reaches the line end: '+sc.toJsonString(walked.last)).toBe(true);
        let frames = await context.page.evaluate(TestPlayerWalkAnimations.STOP_SPRITE);
        expect(
            new Set(frames.map((frame) => sc.toJsonString(frame.player))).size,
            'The used item animation sprite is attached to the player while it walks'
        ).toBeGreaterThan(1);
        expect(
            frames.filter((frame) => sc.toJsonString(frame.player) !== sc.toJsonString(frame.attached)),
            'The attached sprite follows the player sprite on every frame'
        ).toEqual([]);
    }

    static async runDiagonalWalkTest(context)
    {
        let walkContext = await MovementScenario.enterReadyRoom(context, Login.TOWN_ROOM_NAME);
        await MovementScenario.placePlayerOnReturnPoint(context.page, walkContext);
        let sessionId = await context.page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId);
        await context.page.evaluate(TestPlayerWalkAnimations.RECORD_SPRITE, sessionId);
        await context.page.keyboard.down('ArrowRight');
        await context.page.keyboard.down('ArrowDown');
        await context.page.waitForTimeout(TestPlayerWalkAnimations.DIAGONAL_WALK_MS);
        await context.page.keyboard.up('ArrowRight');
        await context.page.keyboard.up('ArrowDown');
        await RoomMovementApi.waitForPlayerStill(
            context.gameConfig,
            Login.TOWN_ROOM_NAME,
            walkContext.playerName,
            TimeConstants.SERVER_RESPONSE
        );
        let frames = await context.page.evaluate(TestPlayerWalkAnimations.STOP_SPRITE);
        expect(
            frames.filter((frame, index) => 0 < index
                && frame.position[0] > frames[index - 1].position[0]
                && frame.position[1] > frames[index - 1].position[1]
            ).length,
            'The own diagonal walk steps the sprite on both axes in the same frame'
        ).toBeGreaterThan(0);
    }

    static run()
    {
        test.describe('Player Walk Animations', () => {
            test('a walking player plays and stops its direction animation with its name and depth on every client', async ({ page, secondPage, gameConfig, longRun }) => {
                await TestPlayerWalkAnimations.runWalkAnimationTest({page, secondPage, gameConfig, longRun}, {});
            });
            test('the own diagonal walk steps the sprite on both axes in the same frame', async ({ page, gameConfig, longRun }) => {
                await TestPlayerWalkAnimations.runDiagonalWalkTest({page, gameConfig, longRun});
            });
            test('the item animation attached to a walking player follows its sprite', async ({ page, gameConfig, longRun }) => {
                await TestPlayerWalkAnimations.runAttachedSpriteTest({page, gameConfig, longRun});
            });
        });
    }

}

TestPlayerWalkAnimations.run();
