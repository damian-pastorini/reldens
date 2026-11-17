/**
 *
 * Reldens - Client Interpolation Showcase
 *
 * Steps of the client interpolation spec that run only in the long run, so its videos show every movement on screen.
 * The recording starts once the setup is done. The live body speed of the walkers is lowered, so the walks last for
 * seconds. The player placements use the e2eTraderKey NPC as their anchor: it stands 5 tiles from the town return
 * point, so the whole jump fits on the screen, while the e2eNpcKey NPC stands 9 tiles away, at the edge of the zoomed
 * view. The camera stops following before the own placement, so the landing is seen in its one frame and the camera
 * slide that follows it, which looks like the player walking, never runs; the target tile of that placement is read
 * from a first placement before the recording and marked on the map. The second client records after its login, the
 * first client uses a wider zoom to see the whole walk of the other player and the other player lands apart from the
 * own player, the second client camera lands with it instead of sliding. The object placement goes further from its
 * original tile, away from the other NPCs, and the player stands off its walking line, so the NPC never pushes it. The
 * scene change skips the town crossing placing the player next to the NPC, moved near the change point and put back
 * before the recording. The normal run skips all of them.
 *
 */

const { expect } = require('@playwright/test');
const { Login } = require('./login');
const { Navigation } = require('./navigation');
const { LongRunShowcase } = require('./long-run-showcase');
const { ShowcaseSteps } = require('./showcase-steps');
const { MovementScenario } = require('./movement-scenario');
const { ParallelSpecGroups } = require('./parallel-spec-groups');
const { RoomMovementApi } = require('./room-movement-api');
const { GameplayE2eStateApi } = require('./gameplay-e2e-state-api');
const { InterpolationFramesRecorder } = require('./interpolation-frames-recorder');
const { SecurityApi } = require('./security-api');
const { TimeConstants } = require('./time-constants');
const { sc } = require('@reldens/utils');

class ClientInterpolationShowcase
{

    static WALK_MS = 3000;
    static NORMAL_WALK_KEY = 'ArrowRight';
    static WALK_KEY = 'ArrowDown';
    static WALK_TILES_DISTANCES = [4, 3, 2];
    static FOREST_WALK_DISTANCES = [8, 7, 6, 5, 4, 3];
    static OBJECT_TILES_DISTANCES = [7, 6, 5, 4, 3, 2, 1];
    static BODY_SPEED_PROPERTY = 'movementSpeed';
    static BODY_SPEED = 90;
    static OWN_PLACEMENT_DISTANCE = 2;
    static OTHER_PLACEMENT_DISTANCE = 4;
    static OBJECT_PLAYER_TILE_OFFSET = {columns: -3, rows: 3};
    static WIDE_ZOOM = 1.5;
    static CHANGE_POINT_WALK_ROW = 11;
    static INSTANT_CAMERA_LERP = 1;
    static SECOND_CLIENT_SUFFIX = 'player2';
    static TILE_MARK = {color: 0xff00ff, alpha: 0.6, borderWidth: 3, depth: 1};
    static OWN_WALK_STEP = 'The player walks: the sprite steps toward its moving server state, frame by frame';
    static OTHER_WALK_STEP = 'First client: the other player walks and this client steps its sprite toward its state';
    static SECOND_WALK_STEP = 'Second client: its own player walks, the first client must follow it';
    static CHANGE_POINT_STEP = 'The player walks into the forest change point at the top of the town';
    static ARRIVAL_STEP = 'The player changed the scene and arrived in the forest';

    static async setCameraCatchUp(page, isInstant)
    {
        await page.evaluate((args) => {
            let scene = window.reldens.getActiveScene();
            scene.cameras.main.setLerp(
                args.isInstant ? args.instantLerp : scene.player.cameraInterpolationX,
                args.isInstant ? args.instantLerp : scene.player.cameraInterpolationY
            );
        }, {isInstant, instantLerp: ClientInterpolationShowcase.INSTANT_CAMERA_LERP});
    }

    static async startRecording(page, stepText, longRun, suffix = '', zoom = LongRunShowcase.CAMERA_ZOOM)
    {
        return await LongRunShowcase.startGameplayRecording(page, longRun, stepText, zoom, suffix);
    }

    static async slowBody(gameConfig, roomName, bodyOwner, longRun)
    {
        if(!longRun){
            return false;
        }
        let bodyChange = await SecurityApi.request(gameConfig, 'POST', '/api/e2e/live-objects/body-property', {
            roomName,
            group: ParallelSpecGroups.EXCLUSIVE_GROUP,
            bodyOwner,
            propertyKey: ClientInterpolationShowcase.BODY_SPEED_PROPERTY,
            value: ClientInterpolationShowcase.BODY_SPEED
        });
        expect(bodyChange.value, 'The body of '+bodyOwner+' must walk slower: '+sc.toJsonString(bodyChange))
            .toBe(ClientInterpolationShowcase.BODY_SPEED);
        return true;
    }

    static async prepareOwnWalk(page, context, longRun)
    {
        await ClientInterpolationShowcase.slowBody(context.gameConfig, context.roomName, context.playerName, longRun);
        return await LongRunShowcase.startGameplayRecording(page, longRun, ClientInterpolationShowcase.OWN_WALK_STEP);
    }

    static async walkOwnPlayer(page, normalWalkMs, longRun)
    {
        await Navigation.walkInDirection(
            page,
            longRun ? ClientInterpolationShowcase.WALK_KEY : ClientInterpolationShowcase.NORMAL_WALK_KEY,
            longRun ? ClientInterpolationShowcase.WALK_MS : normalWalkMs
        );
        return true;
    }

    static async holdCamera(page)
    {
        await page.evaluate(() => {
            window.reldens.getActiveScene().cameras.main.stopFollow();
        });
    }

    static async markTile(page, position)
    {
        await page.evaluate((mark) => {
            window.reldens.getActiveScene().add.rectangle(
                mark.x,
                mark.y,
                mark.size,
                mark.size,
                mark.color,
                mark.alpha
            ).setStrokeStyle(mark.borderWidth, mark.color).setDepth(mark.depth);
        }, {
            ...ClientInterpolationShowcase.TILE_MARK,
            x: position.x,
            y: position.y,
            size: Navigation.TILE_SIZE
        });
    }

    static async showWalkResult(page, resultText, summary, longRun)
    {
        await LongRunShowcase.waitForCamera(page, longRun);
        return await ShowcaseSteps.showAndPause(
            page,
            resultText+': '+summary.frames+' frames, '+summary.partialMoving+' partial steps, '
                +summary.mismatches.length+' mismatches',
            longRun
        );
    }

    static async showPlacementResult(page, summary, longRun)
    {
        return await ShowcaseSteps.showAndPause(
            page,
            'Landed in one frame: a jump of '+Math.round(summary.longestPlacedJump)+' pixels, '
                +summary.moving+' stepped frames in the whole recording',
            longRun
        );
    }

    static async showOtherPlacementResult(page, secondPage, summary, longRun)
    {
        await LongRunShowcase.showStep(secondPage, 'Second client: the first client must show this landing', longRun);
        return await ClientInterpolationShowcase.showPlacementResult(page, summary, longRun);
    }

    static async startWithPlacementAnchor(page, gameConfig, longRun)
    {
        let context = await MovementScenario.start(page, gameConfig, longRun);
        if(!longRun){
            return context;
        }
        return Object.assign({}, context, {npcKey: gameConfig.e2eTraderKey});
    }

    static async prepareOwnPlacement(page, context, longRun)
    {
        if(!longRun){
            return false;
        }
        let target = await MovementScenario.placePlayerNextToNpc(
            page,
            context,
            ClientInterpolationShowcase.OWN_PLACEMENT_DISTANCE
        );
        await MovementScenario.placePlayerOnReturnPoint(page, context);
        await ClientInterpolationShowcase.startRecording(
            page,
            'The server will place the player on the marked tile '+Math.floor(target.position.x / Navigation.TILE_SIZE)
                +','+Math.floor(target.position.y / Navigation.TILE_SIZE)+': it must land there in one frame',
            longRun
        );
        await ClientInterpolationShowcase.markTile(page, target.position);
        await ClientInterpolationShowcase.holdCamera(page);
        await page.waitForTimeout(TimeConstants.pauseMs(longRun));
        return true;
    }

    static async startBothClientsRecording(page, secondPage, context, walkerName, longRun)
    {
        await ClientInterpolationShowcase.slowBody(context.gameConfig, context.roomName, walkerName, longRun);
        await Promise.all([
            ClientInterpolationShowcase.startRecording(
                page,
                ClientInterpolationShowcase.OTHER_WALK_STEP,
                longRun,
                '',
                ClientInterpolationShowcase.WIDE_ZOOM
            ),
            ClientInterpolationShowcase.startRecording(
                secondPage,
                ClientInterpolationShowcase.SECOND_WALK_STEP,
                longRun,
                ClientInterpolationShowcase.SECOND_CLIENT_SUFFIX
            )
        ]);
    }

    static async prepareOtherPlayerPlacement(page, secondPage, walkedPlayer, longRun)
    {
        if(!longRun){
            return false;
        }
        await Promise.all([
            LongRunShowcase.showStep(
                page,
                'The other player stopped on '+walkedPlayer.x+','+walkedPlayer.y+': the server will place it now',
                longRun
            ),
            LongRunShowcase.showStep(secondPage, 'Second client: the server will place its player now', longRun)
        ]);
        await ClientInterpolationShowcase.setCameraCatchUp(secondPage, true);
        await page.waitForTimeout(TimeConstants.pauseMs(longRun));
        return true;
    }

    static async prepareObjectWalk(page, context, origin, longRun)
    {
        if(!longRun){
            return false;
        }
        await ClientInterpolationShowcase.placePlayerAroundTile(page, context, [
            origin[0] + ClientInterpolationShowcase.OBJECT_PLAYER_TILE_OFFSET.columns,
            origin[1] + ClientInterpolationShowcase.OBJECT_PLAYER_TILE_OFFSET.rows
        ]);
        await ClientInterpolationShowcase.slowBody(context.gameConfig, context.roomName, context.npcKey, longRun);
        return await ClientInterpolationShowcase.startRecording(
            page,
            'The NPC stands on its original tile '+origin.join(','),
            longRun
        );
    }

    static pickObjectStartTile(walkableTiles, origin, longRun)
    {
        if(!longRun){
            return [...walkableTiles].shift();
        }
        return walkableTiles.find(tile => tile[0] < origin[0]) || [...walkableTiles].shift();
    }

    static async showObjectPlacement(page, tile, longRun)
    {
        await ShowcaseSteps.showAndPause(
            page,
            'The server placed the NPC on the tile '+tile.join(',')+': its sprite landed there in one frame',
            longRun
        );
        return await LongRunShowcase.showStep(
            page,
            'The NPC walks back to its original tile: its sprite steps toward the moving body',
            longRun
        );
    }

    static async restoreLiveChanges(gameConfig, e2eGroup, longRun)
    {
        if(!longRun){
            return false;
        }
        return await GameplayE2eStateApi.restoreLiveObjects(gameConfig, e2eGroup);
    }

    static async walkIntoTheForest(page, context, longRun)
    {
        let sessionId = await MovementScenario.walkIntoTheForest(page, context, longRun);
        await LongRunShowcase.showStep(page, ClientInterpolationShowcase.ARRIVAL_STEP, longRun);
        return sessionId;
    }

    static async placeOwnPlayer(page, context, longRun)
    {
        return await MovementScenario.placePlayerNextToNpc(
            page,
            context,
            longRun ? ClientInterpolationShowcase.OWN_PLACEMENT_DISTANCE : 0
        );
    }

    static async placePlayerAroundTile(page, context, tile)
    {
        let npc = await context.fetchNpc();
        await RoomMovementApi.placeObject(context.gameConfig, context.roomName, context.npcKey, tile);
        await MovementScenario.placePlayerNextToNpc(page, context, 0);
        await RoomMovementApi.placeObject(
            context.gameConfig,
            context.roomName,
            context.npcKey,
            [npc.originalCol, npc.originalRow]
        );
    }

    static async prepareChangePointWalk(page, context, longRun)
    {
        if(!longRun){
            return false;
        }
        await ClientInterpolationShowcase.placePlayerAroundTile(page, context, [
            Math.floor(Login.FOREST_TRANSITION_X / Navigation.TILE_SIZE),
            ClientInterpolationShowcase.CHANGE_POINT_WALK_ROW
        ]);
        await ClientInterpolationShowcase.slowBody(context.gameConfig, context.roomName, context.playerName, longRun);
        return await ClientInterpolationShowcase.startRecording(
            page,
            ClientInterpolationShowcase.CHANGE_POINT_STEP,
            longRun
        );
    }

    static async showForestArrival(page, context, sessionId, longRun)
    {
        if(!longRun){
            return false;
        }
        await ClientInterpolationShowcase.slowBody(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            context.playerName,
            longRun
        );
        await ClientInterpolationShowcase.setCameraCatchUp(page, true);
        await LongRunShowcase.waitForCamera(page, longRun);
        await ClientInterpolationShowcase.setCameraCatchUp(page, false);
        let positions = await InterpolationFramesRecorder.readPlayerPositions(page, sessionId);
        await LongRunShowcase.showStep(
            page,
            'The sprite starts on its server state '+positions.state.x+','+positions.state.y+': now it walks left',
            longRun
        );
        await page.waitForTimeout(TimeConstants.pauseMs(longRun));
        return true;
    }

}

module.exports.ClientInterpolationShowcase = ClientInterpolationShowcase;
