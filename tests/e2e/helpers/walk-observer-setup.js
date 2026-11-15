/**
 *
 * Reldens - Walk Observer Setup
 *
 * Puts two town players ready for a walk seen by both clients: the town moving objects are paused, the observer is
 * placed next to the town NPC and the walker alone on the town return point (both players log in on that point, so
 * the walker would be pushed by the observer body), and returns the walker walk context. The observer placement is
 * also used alone, to keep the town return point free for a player that arrives there. The walker pointer move sends
 * the pointer message for a tile and expects the server trail to end with the walker still on that tile.
 *
 */

const { expect } = require('@playwright/test');
const { MovementScenario } = require('./movement-scenario');
const { RoomMovementApi } = require('./room-movement-api');
const { RoomMessagesRecorder } = require('./room-messages-recorder');
const { Login } = require('./login');
const { GameConst } = require('../../../lib/game/constants');
const { sc } = require('@reldens/utils');

class WalkObserverSetup
{

    static NPC_MINIMUM_TILES = 2;

    static async placeObserverNextToNpc(context, observer)
    {
        await MovementScenario.pauseMovingObjects(context.gameConfig, Login.TOWN_ROOM_NAME);
        await MovementScenario.placePlayerNextToNpc(
            observer.page,
            Object.assign(
                {npcKey: context.gameConfig.e2eNpcKey},
                MovementScenario.createWalkContext(context.gameConfig, Login.TOWN_ROOM_NAME, observer.playerName, context.longRun)
            ),
            WalkObserverSetup.NPC_MINIMUM_TILES
        );
    }

    static async placeWalkerAlone(context, walker, observer)
    {
        await WalkObserverSetup.placeObserverNextToNpc(context, observer);
        let walkContext = MovementScenario.createWalkContext(
            context.gameConfig,
            Login.TOWN_ROOM_NAME,
            walker.playerName,
            context.longRun
        );
        await MovementScenario.placePlayerOnReturnPoint(walker.page, walkContext);
        return walkContext;
    }

    static async walkPointerTo(page, walkContext, tile)
    {
        await RoomMessagesRecorder.sendMessage(page, {act: GameConst.POINTER, column: tile[0], row: tile[1]});
        let walked = await RoomMovementApi.collectTrail(
            walkContext.fetchPlayer,
            (player) => walkContext.isStill(player) && tile[0] === player.currentCol && tile[1] === player.currentRow,
            walkContext.navTimeout
        );
        expect(walked.done, 'The walker reaches the tile '+tile.join(',')+': '+sc.toJsonString(walked.last)).toBe(true);
        return walked;
    }

}

module.exports.WalkObserverSetup = WalkObserverSetup;
