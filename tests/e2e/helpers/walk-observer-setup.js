/**
 *
 * Reldens - Walk Observer Setup
 *
 * Puts two town players ready for a walk seen by both clients: the town moving objects are paused, the observer is
 * placed next to the town NPC and the walker alone on the town return point (both players log in on that point, so
 * the walker would be pushed by the observer body), and returns the walker walk context.
 *
 */

const { MovementScenario } = require('./movement-scenario');
const { Login } = require('./login');

class WalkObserverSetup
{

    static NPC_MINIMUM_TILES = 2;

    static async placeWalkerAlone(context, walker, observer)
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
        let walkContext = MovementScenario.createWalkContext(
            context.gameConfig,
            Login.TOWN_ROOM_NAME,
            walker.playerName,
            context.longRun
        );
        await MovementScenario.placePlayerOnReturnPoint(walker.page, walkContext);
        return walkContext;
    }

}

module.exports.WalkObserverSetup = WalkObserverSetup;
