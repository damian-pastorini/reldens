/**
 *
 * Reldens - Test World Player Revive
 *
 * Tests a player body revived on the real P2world of WallsWorldBaseTest (ISSUE #460): the body deactivated as dead (or
 * disabled, like during an ad), given a velocity and a path while it is blocked (the contact of the killing hit or of
 * an enemy touching it, the world integration skips a blocked body so nothing stops it), taken out of the world and
 * added back, is activated by the scene activatePlayer stopped with no path and stays on its position over the next
 * world steps.
 *
 */

const { WallsWorldBaseTest } = require('./fixtures/walls-world-base-test');
const { RoomScene } = require('../lib/rooms/server/scene');
const { GameConst } = require('../lib/game/constants');
const { sc } = require('@reldens/utils');

class TestWorldPlayerRevive extends WallsWorldBaseTest
{

    constructor(config)
    {
        super(config);
        this.deathPosition = {x: 80, y: 144};
        this.deathVelocity = [-30, 0];
        this.deathPath = [[1, 4]];
    }

    async activateFrom(blockedState)
    {
        let world = await this.createWorld({groupWallsVertically: false, groupWallsHorizontally: true});
        let body = world.createPlayerBody({
            id: 'revived-player',
            width: this.walkerSize,
            height: this.walkerSize,
            speed: 0,
            bodyState: Object.assign({dir: GameConst.DOWN}, this.deathPosition)
        });
        let scene = {activateBody: RoomScene.prototype.activateBody};
        let playerSchema = {player_id: 7, state: {inState: blockedState}, physicalBody: body};
        RoomScene.prototype.deactivateBody.call(scene, body, playerSchema.player_id, blockedState);
        body.velocity = [...this.deathVelocity];
        body.autoMoving = [...this.deathPath];
        world.removeBody(body);
        world.addBody(body);
        RoomScene.prototype.activatePlayer.call(scene, playerSchema, GameConst.STATUS.ACTIVE);
        this.stepWorld(world);
        return [this.removeWalker(world, body), body.autoMoving, body.isBlocked, playerSchema.state.inState, body.bodyState.inState];
    }

    async testABodyActivatedAfterItsDeathOrDisabledTimeStaysStopped()
    {
        await this.test('a body given a velocity and a path while dead or disabled is activated stopped with no path on its position', async () => {
            let activations = [];
            for(let blockedState of [GameConst.STATUS.DEATH, GameConst.STATUS.DISABLED]){
                activations.push(await this.activateFrom(blockedState));
            }
            let stopped = [
                {position: [this.deathPosition.x, this.deathPosition.y], velocity: [0, 0]},
                false,
                false,
                GameConst.STATUS.ACTIVE,
                GameConst.STATUS.ACTIVE
            ];
            this.assert.deepStrictEqual(
                activations,
                [stopped, stopped],
                'The activated bodies kept no velocity nor path from their blocked time: '+sc.toJsonString(activations)
            );
        });
    }

}

module.exports.TestWorldPlayerRevive = TestWorldPlayerRevive;
