/**
 *
 * Reldens - Bullet Observer Setup
 *
 * Puts a shooter and an observer in the forest for the bullet specs: the first group player enters the forest, the
 * second one moves there from the town through the change point (it only watches), every enemy but one active enemy
 * (aggressive or passive as asked) is disabled and the moving objects paused, an optional step runs on that enemy (like
 * turning its aggression off) and the shooter is placed on a clear line of tiles from that enemy (the given distances
 * or 4 and 3 tiles) and targets it. It returns the observer, the enemy snapshot and the shooter placement.
 *
 */

const { expect } = require('@playwright/test');
const { Login } = require('./login');
const { TeamSteps } = require('./team-steps');
const { MovementScenario } = require('./movement-scenario');
const { RoomObjectsApi } = require('./room-objects-api');
const { GameConst } = require('../../../lib/game/constants');
const { ObjectsConst } = require('../../../lib/objects/constants');

class BulletObserverSetup
{

    static BULLET_TILES_DISTANCES = [4, 3];
    static OBSERVER_SUFFIX = '2';

    static async enterShooterAndObserver(context, isAggressive, options = {})
    {
        let forestData = await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        let observer = {page: context.secondPage, playerName: context.gameConfig.e2ePlayerName2};
        await Login.loginRootPlayer(observer.page, context.gameConfig, context.longRun, BulletObserverSetup.OBSERVER_SUFFIX);
        await TeamSteps.changeScene(context, observer, Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME);
        await MovementScenario.waitForReadyScene(observer.page);
        let enemy = (await RoomObjectsApi.fetchRoomObjects(context.gameConfig, Login.FOREST_ROOM_NAME)).find(
            snapshot => ObjectsConst.TYPE_ENEMY === snapshot.type
                && GameConst.STATUS.ACTIVE === snapshot.inState
                && isAggressive === Boolean(snapshot.isAggressive)
        );
        expect(enemy, 'The forest has an active enemy, aggressive: '+isAggressive).toBeTruthy();
        await MovementScenario.stopMovingBodies(context.gameConfig, Login.FOREST_ROOM_NAME, enemy.bodyKey);
        if(options.beforePlacement){
            await options.beforePlacement(enemy);
        }
        let placement = await MovementScenario.placePlayerInLineAndTarget(
            context.page,
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            enemy.key,
            forestData.sceneTimeout,
            options.distances || BulletObserverSetup.BULLET_TILES_DISTANCES
        );
        return {observer, enemy, placement};
    }

}

module.exports.BulletObserverSetup = BulletObserverSetup;
