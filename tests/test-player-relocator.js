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

    buildInTown(options = {})
    {
        let setup = this.roomBuilder.build(this.roomBuilder.townRoom.roomName, options);
        setup.initialState = Object.assign({}, setup.playerSchema.state);
        return setup;
    }

    assertNothingChanged(setup)
    {
        this.assert.deepStrictEqual(setup.playerSchema.state, setup.initialState);
        this.assert.strictEqual(setup.savedStates, 0);
        this.assert.deepStrictEqual(setup.broadcasts, []);
        this.assert.deepStrictEqual(setup.sceneChanges, []);
        this.assert.deepStrictEqual(setup.clearedIntervals, []);
        this.assert.deepStrictEqual(setup.bodyStops, []);
    }

    async testSameRoomRelocationPlacesTheBodyOnTheReturnPoint()
    {
        await this.test('a relocation in the same room places the body on the room default return point', async () => {
            let townRoom = this.roomBuilder.townRoom;
            let setup = this.buildInTown();
            let returnPoint = townRoom.returnPointDefault;
            this.assert.strictEqual(await this.relocate(setup, townRoom.roomName), true);
            this.assert.deepStrictEqual(setup.playerBody.position, [returnPoint.x, returnPoint.y]);
            this.assert.strictEqual(setup.playerBody.aabbNeedsUpdate, true);
            this.assert.deepStrictEqual(setup.positionedPlayers, [{
                id: setup.client.sessionId,
                x: returnPoint.x,
                y: returnPoint.y
            }]);
            let expectedState = Object.assign({}, setup.initialState, {
                mov: false,
                x: returnPoint.x,
                y: returnPoint.y,
                dir: returnPoint.d
            });
            this.assert.deepStrictEqual(setup.playerSchema.state, expectedState);
            this.assert.deepStrictEqual(setup.savedStateValues, [expectedState]);
            this.assert.deepStrictEqual(setup.clearedIntervals, [setup.playerSchema.player_id]);
            this.assert.deepStrictEqual(setup.bodyStops, ['resetAuto', 'stopFull']);
            this.assert.deepStrictEqual(setup.broadcasts, []);
            this.assert.deepStrictEqual(setup.sceneChanges, []);
            this.assert.strictEqual(setup.playerBody.isChangingScene, false);
        });
    }

    async testSameRoomRelocationUsesTheGivenPosition()
    {
        await this.test('a relocation in the same room uses the given position and direction', async () => {
            let setup = this.buildInTown();
            let destination = {x: 640, y: 320, dir: GameConst.LEFT};
            this.assert.strictEqual(await this.relocate(setup, this.roomBuilder.townRoom.roomName, destination), true);
            this.assert.deepStrictEqual(setup.playerBody.position, [destination.x, destination.y]);
            this.assert.strictEqual(setup.playerSchema.state.dir, destination.dir);
        });
    }

    async testZeroPositionIsAValidPosition()
    {
        await this.test('a zero position is used as a valid position', async () => {
            let setup = this.buildInTown();
            await this.relocate(setup, this.roomBuilder.townRoom.roomName, {x: 0, y: 0});
            this.assert.deepStrictEqual(setup.playerBody.position, [0, 0]);
            this.assert.strictEqual(setup.playerSchema.state.dir, this.roomBuilder.townRoom.returnPointDefault.d);
        });
    }

    async testInvalidPositionValuesKeepTheReturnPoint()
    {
        await this.test('a not numeric, a partial or a not object position keeps the return point', async () => {
            let returnPoint = this.roomBuilder.townRoom.returnPointDefault;
            let invalidPositions = [{x: '640', y: 320}, {x: 640}, {y: 320}, true, 'north', null];
            for(let invalidPosition of invalidPositions){
                let setup = this.buildInTown();
                this.assert.strictEqual(
                    await this.relocate(setup, this.roomBuilder.townRoom.roomName, invalidPosition),
                    true
                );
                this.assert.deepStrictEqual(setup.playerBody.position, [returnPoint.x, returnPoint.y]);
                this.assert.strictEqual(setup.playerSchema.state.dir, returnPoint.d);
            }
        });
    }

    async testOnlyAValidDirectionIsUsed()
    {
        await this.test('an invalid direction is ignored and a valid one is used without a position', async () => {
            let returnPoint = this.roomBuilder.townRoom.returnPointDefault;
            let invalidDirectionSetup = this.buildInTown();
            await this.relocate(invalidDirectionSetup, this.roomBuilder.townRoom.roomName, {x: 1, y: 2, dir: 'jump'});
            this.assert.strictEqual(invalidDirectionSetup.playerSchema.state.dir, returnPoint.d);
            this.assert.deepStrictEqual(invalidDirectionSetup.playerBody.position, [1, 2]);
            let onlyDirectionSetup = this.buildInTown();
            await this.relocate(onlyDirectionSetup, this.roomBuilder.townRoom.roomName, {dir: GameConst.RIGHT});
            this.assert.strictEqual(onlyDirectionSetup.playerSchema.state.dir, GameConst.RIGHT);
            this.assert.deepStrictEqual(onlyDirectionSetup.playerBody.position, [returnPoint.x, returnPoint.y]);
        });
    }

    async testSameRoomSaveErrorReturnsFalse()
    {
        await this.test('a state save error in the same room returns false and never changes the scene', async () => {
            let setup = this.buildInTown({saveResult: false});
            this.assert.strictEqual(await this.relocate(setup, this.roomBuilder.townRoom.roomName), false);
            this.assert.strictEqual(setup.savedStates, 1);
            this.assert.deepStrictEqual(setup.broadcasts, []);
            this.assert.deepStrictEqual(setup.sceneChanges, []);
            this.assert.strictEqual(setup.playerBody.isChangingScene, false);
        });
    }

    async testAnotherRoomRelocationRunsTheSceneChange()
    {
        await this.test('a relocation to another room saves the new state before the scene change', async () => {
            let townRoom = this.roomBuilder.townRoom;
            let forestRoom = this.roomBuilder.forestRoom;
            let setup = this.buildInTown();
            this.assert.strictEqual(await this.relocate(setup, forestRoom.roomName), true);
            let expectedState = {
                scene: forestRoom.roomName,
                room_id: forestRoom.roomId,
                x: forestRoom.returnPointDefault.x,
                y: forestRoom.returnPointDefault.y,
                dir: forestRoom.returnPointDefault.d
            };
            this.assert.deepStrictEqual(setup.savedStateValues, [expectedState]);
            this.assert.deepStrictEqual(setup.broadcastsOnSave, [0]);
            this.assert.deepStrictEqual(setup.playerSchema.state, expectedState);
            this.assert.deepStrictEqual(setup.broadcasts, [{
                act: GameConst.CHANGING_SCENE,
                id: setup.client.sessionId,
                scene: townRoom.roomName,
                prev: townRoom.roomName
            }]);
            this.assert.deepStrictEqual(setup.sceneChanges, [{scene: forestRoom.roomName, prev: townRoom.roomName}]);
            this.assert.deepStrictEqual(setup.clearedIntervals, [setup.playerSchema.player_id]);
            this.assert.deepStrictEqual(setup.bodyStops, ['resetAuto', 'stopFull']);
            this.assert.deepStrictEqual(setup.positionedPlayers, []);
            this.assert.strictEqual(setup.playerBody.isChangingScene, true);
        });
    }

    async testAnotherRoomRelocationUsesTheGivenPosition()
    {
        await this.test('a relocation to another room saves the given position and direction', async () => {
            let forestRoom = this.roomBuilder.forestRoom;
            let setup = this.buildInTown();
            let destination = {x: 640, y: 320, dir: GameConst.LEFT};
            this.assert.strictEqual(await this.relocate(setup, forestRoom.roomName, destination), true);
            this.assert.deepStrictEqual(setup.savedStateValues, [{
                scene: forestRoom.roomName,
                room_id: forestRoom.roomId,
                x: destination.x,
                y: destination.y,
                dir: destination.dir
            }]);
        });
    }

    async testRoomWithoutReturnPointUsesTheDefaultPosition()
    {
        await this.test('a destination room without return point uses the default state position', async () => {
            let noReturnPointRoom = this.roomBuilder.noReturnPointRoom;
            let setup = this.buildInTown();
            let defaultPosition = setup.room.loginManager.playerRoomState.defaultStatePosition;
            this.assert.strictEqual(await this.relocate(setup, noReturnPointRoom.roomName), true);
            this.assert.deepStrictEqual(setup.playerSchema.state, {
                scene: noReturnPointRoom.roomName,
                room_id: noReturnPointRoom.roomId,
                x: defaultPosition.x,
                y: defaultPosition.y,
                dir: defaultPosition.dir
            });
        });
    }

    async testUnavailableRoomKeepsThePlayer()
    {
        await this.test('an unavailable destination room keeps the player in the current room', async () => {
            let setup = this.buildInTown({isRoomAvailable: false});
            this.assert.strictEqual(await this.relocate(setup, this.roomBuilder.forestRoom.roomName), false);
            this.assertNothingChanged(setup);
            this.assert.strictEqual(setup.playerBody.isChangingScene, false);
        });
    }

    async testStateSaveErrorCancelsTheSceneChange()
    {
        await this.test('a state save error restores the state and never starts the client scene change', async () => {
            let forestRoom = this.roomBuilder.forestRoom;
            let setup = this.buildInTown({saveResult: false});
            this.assert.strictEqual(await this.relocate(setup, forestRoom.roomName), false);
            this.assert.strictEqual(setup.savedStates, 1);
            this.assert.strictEqual([...setup.savedStateValues].shift().scene, forestRoom.roomName);
            this.assert.deepStrictEqual(setup.playerSchema.state, setup.initialState);
            this.assert.deepStrictEqual(setup.broadcasts, []);
            this.assert.deepStrictEqual(setup.sceneChanges, []);
            this.assert.strictEqual(setup.playerBody.isChangingScene, false);
        });
    }

    async testPlayerChangingSceneIsNotRelocated()
    {
        await this.test('a player already changing the scene is not relocated and keeps its scene change', async () => {
            let setup = this.buildInTown({isChangingScene: true});
            this.assert.strictEqual(await this.relocate(setup, this.roomBuilder.forestRoom.roomName), false);
            this.assert.deepStrictEqual(setup.loadedRooms, []);
            this.assertNothingChanged(setup);
            this.assert.strictEqual(setup.playerBody.isChangingScene, true);
        });
    }

    async testUnknownRoomIsNotRelocated()
    {
        await this.test('an unknown destination room is not relocated', async () => {
            let setup = this.buildInTown();
            this.assert.strictEqual(await this.relocate(setup, 'missing-room'), false);
            this.assert.deepStrictEqual(setup.loadedRooms, ['missing-room']);
            this.assertNothingChanged(setup);
            this.assert.strictEqual(setup.playerBody.isChangingScene, false);
        });
    }

    async testPlayerWithoutBodyIsNotRelocated()
    {
        await this.test('a player without body is not relocated', async () => {
            let setup = this.buildInTown({withBody: false});
            this.assert.strictEqual(await this.relocate(setup, this.roomBuilder.forestRoom.roomName), false);
            this.assert.deepStrictEqual(setup.loadedRooms, []);
            this.assertNothingChanged(setup);
        });
    }

    async testOverlappingRelocationsRunASingleSceneChange()
    {
        await this.test('two overlapping relocations to another room run a single scene change', async () => {
            let forestRoom = this.roomBuilder.forestRoom;
            let setup = this.buildInTown();
            let results = await Promise.all([
                this.relocate(setup, forestRoom.roomName),
                this.relocate(setup, forestRoom.roomName)
            ]);
            this.assert.deepStrictEqual(results, [true, false]);
            this.assert.deepStrictEqual(setup.loadedRooms, [forestRoom.roomName, forestRoom.roomName]);
            this.assert.strictEqual(setup.savedStates, 1);
            this.assert.strictEqual(setup.broadcasts.length, 1);
            this.assert.strictEqual(setup.sceneChanges.length, 1);
        });
    }

    async testSceneChangeStartedDuringTheRoomLoadSkipsTheRelocation()
    {
        await this.test('a scene change started during the room load skips the relocation', async () => {
            let setup = this.buildInTown();
            let roomsManager = setup.room.loginManager.roomsManager;
            let loadRoomByName = roomsManager.loadRoomByName;
            roomsManager.loadRoomByName = async (roomName) => {
                setup.playerBody.isChangingScene = true;
                return await loadRoomByName(roomName);
            };
            this.assert.strictEqual(await this.relocate(setup, this.roomBuilder.forestRoom.roomName), false);
            this.assertNothingChanged(setup);
            this.assert.strictEqual(setup.playerBody.isChangingScene, true);
        });
    }

    async testBodyRemovedDuringTheRoomLoadSkipsTheRelocation()
    {
        await this.test('a body removed during the room load skips the relocation', async () => {
            let setup = this.buildInTown();
            let roomsManager = setup.room.loginManager.roomsManager;
            let loadRoomByName = roomsManager.loadRoomByName;
            roomsManager.loadRoomByName = async (roomName) => {
                setup.playerSchema.physicalBody = false;
                return await loadRoomByName(roomName);
            };
            this.assert.strictEqual(await this.relocate(setup, this.roomBuilder.forestRoom.roomName), false);
            this.assertNothingChanged(setup);
        });
    }

    async testOverlappingSameRoomRelocationsKeepTheScene()
    {
        await this.test('two overlapping relocations in the same room place the player and never change it', async () => {
            let townRoom = this.roomBuilder.townRoom;
            let setup = this.buildInTown();
            let results = await Promise.all([
                this.relocate(setup, townRoom.roomName),
                this.relocate(setup, townRoom.roomName, {x: 1, y: 2})
            ]);
            this.assert.deepStrictEqual(results, [true, true]);
            this.assert.deepStrictEqual(setup.playerBody.position, [1, 2]);
            this.assert.strictEqual(setup.savedStates, 2);
            this.assert.deepStrictEqual(setup.broadcasts, []);
            this.assert.strictEqual(setup.playerBody.isChangingScene, false);
        });
    }

}

module.exports.TestPlayerRelocator = TestPlayerRelocator;
