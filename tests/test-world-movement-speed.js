/**
 *
 * Reldens - Test World Movement Speed
 *
 */

const { BaseTest } = require('./base-test');
const { P2world } = require('../lib/world/server/p2world');
const { WorldConfig } = require('../lib/rooms/server/world-config');
const { ConfigProcessor } = require('../lib/config/processor');
const { GameConst } = require('../lib/game/constants');

class TestWorldMovementSpeed extends BaseTest
{

    walkSpeeds(globalWorldConfig, physicsBody, roomCustomData, playerStatSpeed)
    {
        let config = Object.assign(new ConfigProcessor(), {
            avoidLog: true,
            server: {rooms: {world: globalWorldConfig}, players: {physicsBody}},
            client: {players: {animations: {basedOnPress: false, diagonalHorizontal: false}}}
        });
        let room = {customData: roomCustomData};
        WorldConfig.mapWorldConfigValues(room, config);
        let world = new P2world({
            events: {},
            roomId: 1,
            sceneName: 'reldens-new-age-town',
            roomMap: 'reldens-new-age-town',
            mapJson: {width: 10, height: 10},
            config,
            worldConfig: room.worldConfig
        });
        clearInterval(world.worldDateTimeInterval);
        let body = world.createPlayerBody({
            id: 'session-a',
            width: 32,
            height: 32,
            speed: playerStatSpeed,
            bodyState: {x: 64, y: 64, dir: GameConst.DOWN}
        });
        body.initMove(GameConst.RIGHT);
        return [room.worldConfig.movementSpeed, body.movementSpeed, body.velocity[0]];
    }

    async testTheRoomMovementSpeedIsTheWalkSpeed()
    {
        await this.test('a room custom movement speed is the walk speed of the player bodies in its world', async () => {
            let speedConfigOff = {usePlayerSpeedConfig: false, speed: 180};
            this.assert.deepStrictEqual(
                this.walkSpeeds({movementSpeed: 200}, speedConfigOff, {movementSpeed: 240}, 0),
                [240, 240, 240]
            );
            this.assert.deepStrictEqual(this.walkSpeeds({movementSpeed: 200}, speedConfigOff, {}, 0), [200, 200, 200]);
            this.assert.deepStrictEqual(this.walkSpeeds({}, speedConfigOff, {}, 0), [180, 180, 180]);
            this.assert.deepStrictEqual(this.walkSpeeds({}, speedConfigOff, {applyGravity: true}, 0), [160, 160, 160]);
            this.assert.deepStrictEqual(
                this.walkSpeeds({}, speedConfigOff, {applyGravity: true, movementSpeed: 120}, 0),
                [120, 120, 120]
            );
        });
    }

    async testThePlayerSpeedConfigAboveZeroReplacesTheWorldSpeed()
    {
        await this.test('the player speed config replaces the world speed only when it is on and above zero', async () => {
            let speedCases = [
                [{usePlayerSpeedConfig: true, speed: 0}, 0, 240],
                [{usePlayerSpeedConfig: true, speed: -50}, 0, 240],
                [{usePlayerSpeedConfig: true, speed: 300}, 0, 300],
                [{usePlayerSpeedConfig: true}, 250, 250],
                [{usePlayerSpeedConfig: true}, 0, 240],
                [{usePlayerSpeedConfig: false, speed: 300}, 250, 240]
            ];
            for(let [physicsBody, playerStatSpeed, expectedSpeed] of speedCases){
                this.assert.deepStrictEqual(
                    this.walkSpeeds({}, physicsBody, {movementSpeed: 240}, playerStatSpeed),
                    [240, expectedSpeed, expectedSpeed]
                );
            }
        });
    }

}

module.exports.TestWorldMovementSpeed = TestWorldMovementSpeed;
