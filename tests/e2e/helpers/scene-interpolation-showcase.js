/**
 *
 * Reldens - Scene Interpolation Showcase
 *
 * Steps of the scene interpolation branches spec that run only in the long run, so its videos explain what it checks
 * with the player moving most of the time. The current player name is shown (overridden for the group until the next
 * reset), so the player is told apart from the NPCs and located under a roof. With the client interpolation disabled
 * the player walks down the corridor south of the town return point, far from the NPCs. For the layers depths the
 * player first walks down that corridor, unrecorded, and the video shows it walking under the closest walkable tile
 * whose sprite area is filled with over player tiles (from the live scene layers and the server path finder grid) and
 * back. The normal run skips all of them, so its walk and checks stay the same.
 *
 */

const { LongRunShowcase } = require('./long-run-showcase');
const { RecordingStepReadTimer } = require('./recording-step-read-timer');
const { MovementScenario } = require('./movement-scenario');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { SceneInterpolationProbe } = require('./scene-interpolation-probe');
const { WalkableTileLocator } = require('./walkable-tile-locator');
const { sc } = require('@reldens/utils');

class SceneInterpolationShowcase
{

    static CURRENT_PLAYER_NAME_PATH = 'client/ui/players/showCurrentPlayerName';
    static NPC_DISTANCE_TILES = 2;
    static WALK_TILES_RADIUS = 10;
    static WALK_DOWN_STEP = [0, 1];
    static WALK_DOWN_DISTANCES = [9, 8, 7];
    static WALK_UP_STEP = [0, -1];
    static WALK_UP_DISTANCES = [6, 5, 4];
    static COVER_OFFSETS = [[0, 0], [-1, 0], [1, 0], [0, -1], [-1, -1], [1, -1]];

    static async enableCurrentPlayerName(gameConfig, e2eGroup, longRun)
    {
        if(!longRun){
            return false;
        }
        await E2eSeedAndRestoreApi.overrideConfig(
            gameConfig,
            e2eGroup,
            SceneInterpolationShowcase.CURRENT_PLAYER_NAME_PATH,
            true
        );
        return true;
    }

    static async runStep(page, caption, action, holdMs)
    {
        await LongRunShowcase.showStep(page, caption, true);
        await action();
        await page.waitForTimeout(holdMs);
    }

    static async fetchWalkArea(context)
    {
        let player = await context.fetchPlayer();
        let startTile = [player.currentCol, player.currentRow];
        let walkArea = {
            startTile,
            tiles: await context.fetchTiles(startTile, SceneInterpolationShowcase.WALK_TILES_RADIUS)
        };
        walkArea.downTile = WalkableTileLocator.findWalkableAlong(
            walkArea.tiles,
            startTile,
            SceneInterpolationShowcase.WALK_DOWN_STEP,
            SceneInterpolationShowcase.WALK_DOWN_DISTANCES
        );
        return walkArea;
    }

    static async findWalkTilesAwayFromNpcs(context, longRun)
    {
        if(!longRun){
            return false;
        }
        let walkArea = await SceneInterpolationShowcase.fetchWalkArea(context);
        if(!walkArea.downTile){
            return false;
        }
        return [
            walkArea.downTile,
            WalkableTileLocator.findWalkableAlong(
                walkArea.tiles,
                walkArea.downTile,
                SceneInterpolationShowcase.WALK_UP_STEP,
                SceneInterpolationShowcase.WALK_UP_DISTANCES
            )
        ].filter(tile => tile);
    }

    static async walkAwayFromNpcs(page, context, walkTiles)
    {
        if(!walkTiles){
            return false;
        }
        for(let walkTile of walkTiles){
            await MovementScenario.movePlayer(page, context, walkTile, context.navTimeout);
        }
        return true;
    }

    static async placePlayerNearNpc(page, context, longRun)
    {
        if(!longRun){
            return false;
        }
        return await MovementScenario.placePlayerNextToNpc(
            page,
            context,
            SceneInterpolationShowcase.NPC_DISTANCE_TILES
        );
    }

    static async prepareCoverWalk(page, context, layersData, longRun)
    {
        if(!longRun || !layersData){
            return false;
        }
        let walkArea = await SceneInterpolationShowcase.fetchWalkArea(context);
        let coveredTile = sc.get(
            WalkableTileLocator.findClosestTiles(
                await SceneInterpolationProbe.findCoveredTiles(
                    page,
                    walkArea.tiles.walkable,
                    SceneInterpolationShowcase.COVER_OFFSETS,
                    LongRunShowcase.OVER_PLAYER_LAYER_NAME
                ),
                walkArea.startTile,
                1
            ),
            0,
            false
        );
        if(!coveredTile || !walkArea.downTile){
            return false;
        }
        let coverLayer = await SceneInterpolationProbe.readCoveringLayer(
            page,
            coveredTile,
            LongRunShowcase.OVER_PLAYER_LAYER_NAME
        );
        await MovementScenario.movePlayer(page, context, walkArea.downTile, context.navTimeout);
        let coverWalk = {walkStartTile: walkArea.downTile, coveredTile, coverDepth: coverLayer.depth};
        coverWalk.firstCaption = coverLayer.name+' depth: '+coverLayer.layerIndex+' x '+layersData.mapHeight
            +' x '+layersData.tileHeight+' = '+coverLayer.depth
            +', player depth: '+(await SceneInterpolationProbe.readPlayerDepths(page)).player;
        return coverWalk;
    }

    static async showWalkUnderCover(page, context, layersData, coverWalk)
    {
        if(!coverWalk){
            return false;
        }
        await RecordingStepReadTimer.waitForRead(page);
        await MovementScenario.movePlayer(page, context, coverWalk.coveredTile, context.navTimeout);
        await LongRunShowcase.showStep(
            page,
            'Under the roof: player depth '+(await SceneInterpolationProbe.readPlayerDepths(page)).player
                +' is lower than layer depth '+coverWalk.coverDepth,
            true
        );
        await RecordingStepReadTimer.waitForRead(page);
        await MovementScenario.movePlayer(page, context, coverWalk.walkStartTile, context.navTimeout);
        await LongRunShowcase.showStep(
            page,
            'Out of the roof nothing covers the player. Below player layers: depth '+layersData.belowPlayerDepth
                +', change points: depth '+layersData.changePointsDepth,
            true
        );
        return true;
    }

}

module.exports.SceneInterpolationShowcase = SceneInterpolationShowcase;
