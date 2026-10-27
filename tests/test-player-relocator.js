/**
 *
 * Reldens - Test Player Relocator
 *
 */

const { BaseTest } = require('./base-test');
const { RelocationRoomBuilder } = require('./fixtures/relocation-room-builder');
const { PlayerRelocator } = require('../lib/rooms/server/player-relocator');
const { GameConst } = require('../lib/game/constants');

class TestPlayerRelocator extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.roomBuilder = new RelocationRoomBuilder();
    }

    async relocate(setup, destinationRoomName, destinationPosition = false)
    {
        return await new PlayerRelocator(setup.room).relocate(
            setup.client,
            setup.playerSchema,
            destinationRoomName,
            destinationPosition
        );
    }

    async testSameRoomRelocationPlacesTheBodyOnTheReturnPoint()
    {
        await this.test('a relocation in the same room places the body on the room default return point', async () => {
            let townRoom = this.roomBuilder.townRoom;
            let setup = this.roomBuilder.build(townRoom.roomName);
            this.assert.strictEqual(await this.relocate(setup, townRoom.roomName), true);
            this.assert.deepStrictEqual(
                setup.playerBody.position,
                [townRoom.returnPointDefault.x, townRoom.returnPointDefault.y]
            );
            this.assert.deepStrictEqual(setup.positionedPlayers, [{
                id: setup.client.sessionId,
                x: townRoom.returnPointDefault.x,
                y: townRoom.returnPointDefault.y
            }]);
            this.assert.strictEqual(setup.playerSchema.state.dir, townRoom.returnPointDefault.d);
            this.assert.strictEqual(setup.savedStates, 1);
            this.assert.deepStrictEqual(setup.broadcasts, []);
        });
    }

    async testSameRoomRelocationUsesTheGivenPosition()
    {
        await this.test('a relocation in the same room uses the given position and direction', async () => {
            let townRoom = this.roomBuilder.townRoom;
            let setup = this.roomBuilder.build(townRoom.roomName);
            let destination = {x: 640, y: 320, dir: GameConst.LEFT};
            await this.relocate(setup, townRoom.roomName, destination);
            this.assert.deepStrictEqual(setup.playerBody.position, [destination.x, destination.y]);
            this.assert.strictEqual(setup.playerSchema.state.dir, destination.dir);
        });
    }

    async testInvalidPositionValuesAreIgnored()
    {
        await this.test('a position that is not numeric and an invalid direction keep the return point', async () => {
            let townRoom = this.roomBuilder.townRoom;
            let setup = this.roomBuilder.build(townRoom.roomName);
            await this.relocate(setup, townRoom.roomName, {x: '640', y: 320, dir: 'jump'});
            this.assert.deepStrictEqual(
                setup.playerBody.position,
                [townRoom.returnPointDefault.x, townRoom.returnPointDefault.y]
            );
            this.assert.strictEqual(setup.playerSchema.state.dir, townRoom.returnPointDefault.d);
        });
    }

    async testAnotherRoomRelocationRunsTheSceneChange()
    {
        await this.test('a relocation to another room saves the new state and runs the scene change', async () => {
            let townRoom = this.roomBuilder.townRoom;
            let forestRoom = this.roomBuilder.forestRoom;
            let setup = this.roomBuilder.build(townRoom.roomName);
            this.assert.strictEqual(await this.relocate(setup, forestRoom.roomName), true);
            this.assert.deepStrictEqual(setup.broadcasts, [{
                act: GameConst.CHANGING_SCENE,
                id: setup.client.sessionId,
                scene: townRoom.roomName,
                prev: townRoom.roomName
            }]);
            this.assert.strictEqual(setup.playerSchema.state.scene, forestRoom.roomName);
            this.assert.strictEqual(setup.playerSchema.state.room_id, forestRoom.roomId);
            this.assert.strictEqual(setup.playerSchema.state.x, forestRoom.returnPointDefault.x);
            this.assert.strictEqual(setup.playerSchema.state.y, forestRoom.returnPointDefault.y);
            this.assert.deepStrictEqual(setup.sceneChanges, [{scene: forestRoom.roomName, prev: townRoom.roomName}]);
            this.assert.strictEqual(setup.playerBody.isChangingScene, true);
        });
    }

    async testUnavailableRoomKeepsThePlayer()
    {
        await this.test('an unavailable destination room keeps the player in the current room', async () => {
            let townRoom = this.roomBuilder.townRoom;
            let setup = this.roomBuilder.build(townRoom.roomName, {isRoomAvailable: false});
            this.assert.strictEqual(await this.relocate(setup, this.roomBuilder.forestRoom.roomName), false);
            this.assert.strictEqual(setup.playerSchema.state.scene, townRoom.roomName);
            this.assert.strictEqual(setup.playerBody.isChangingScene, false);
            this.assert.deepStrictEqual(setup.broadcasts, []);
        });
    }

    async testStateSaveErrorCancelsTheSceneChange()
    {
        await this.test('a state save error cancels the scene change', async () => {
            let setup = this.roomBuilder.build(this.roomBuilder.townRoom.roomName, {saveResult: false});
            this.assert.strictEqual(await this.relocate(setup, this.roomBuilder.forestRoom.roomName), false);
            this.assert.strictEqual(setup.playerBody.isChangingScene, false);
            this.assert.deepStrictEqual(setup.sceneChanges, []);
        });
    }

    async testPlayerChangingSceneIsNotRelocated()
    {
        await this.test('a player already changing the scene is not relocated', async () => {
            let setup = this.roomBuilder.build(this.roomBuilder.townRoom.roomName, {isChangingScene: true});
            this.assert.strictEqual(await this.relocate(setup, this.roomBuilder.forestRoom.roomName), false);
            this.assert.deepStrictEqual(setup.loadedRooms, []);
        });
    }

    async testUnknownRoomOrMissingBodyIsNotRelocated()
    {
        await this.test('an unknown destination room or a player without body is not relocated', async () => {
            let townRoomName = this.roomBuilder.townRoom.roomName;
            let unknownRoomSetup = this.roomBuilder.build(townRoomName);
            this.assert.strictEqual(await this.relocate(unknownRoomSetup, 'missing-room'), false);
            this.assert.strictEqual(unknownRoomSetup.savedStates, 0);
            let noBodySetup = this.roomBuilder.build(townRoomName, {withBody: false});
            this.assert.strictEqual(await this.relocate(noBodySetup, townRoomName), false);
            this.assert.deepStrictEqual(noBodySetup.loadedRooms, []);
        });
    }

}

module.exports.TestPlayerRelocator = TestPlayerRelocator;
