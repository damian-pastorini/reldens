/**
 *
 * Reldens - Test Scene Change Point
 *
 */

const { BaseTest } = require('./base-test');
const { SceneChangeRoomBuilder } = require('./fixtures/scene-change-room-builder');
const { GameConst } = require('../lib/game/constants');

class TestSceneChangePoint extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.roomBuilder = new SceneChangeRoomBuilder();
    }

    async changeScene(setup, nextRoomName)
    {
        await setup.room.nextSceneInitialPosition(
            setup.client,
            {prev: this.roomBuilder.currentRoomName, next: nextRoomName},
            setup.playerBody
        );
    }

    assertSceneChangeCancelled(setup)
    {
        this.assert.deepStrictEqual(setup.playerSchema.state, setup.initialState);
        this.assert.deepStrictEqual(setup.broadcasts, []);
        this.assert.deepStrictEqual(setup.client.sentMessages, []);
        this.assert.deepStrictEqual(setup.removedBodies, []);
        this.assert.strictEqual(setup.playerBody.isChangingScene, false);
    }

    async testSceneChangeUsesTheReturnPointOfThePreviousRoom()
    {
        await this.test('a scene change saves the return point of the previous room before the client change', async () => {
            let townRoom = this.roomBuilder.townRoom;
            let currentRoomName = this.roomBuilder.currentRoomName;
            let setup = this.roomBuilder.build();
            await this.changeScene(setup, townRoom.roomName);
            let returnPoint = [...townRoom.returnPoints].pop();
            let expectedState = {
                scene: townRoom.roomName,
                room_id: townRoom.roomId,
                x: returnPoint.x,
                y: returnPoint.y,
                dir: returnPoint.d
            };
            this.assert.deepStrictEqual(setup.savedPatches, [{
                playerId: setup.playerSchema.player_id,
                patch: {room_id: townRoom.roomId, x: returnPoint.x, y: returnPoint.y, dir: returnPoint.d}
            }]);
            this.assert.deepStrictEqual(setup.broadcastsOnSave, [0]);
            this.assert.deepStrictEqual(setup.playerSchema.state, expectedState);
            this.assert.deepStrictEqual(setup.broadcasts, [
                {act: GameConst.CHANGING_SCENE, id: setup.client.sessionId, scene: currentRoomName, prev: currentRoomName},
                {
                    act: GameConst.CHANGED_SCENE,
                    id: setup.client.sessionId,
                    scene: townRoom.roomName,
                    prev: currentRoomName,
                    x: returnPoint.x,
                    y: returnPoint.y,
                    dir: returnPoint.d,
                    playerName: setup.playerSchema.playerName,
                    playedTime: GameConst.SHOW_PLAYER_TIME.NONE,
                    avatarKey: setup.playerSchema.avatarKey
                }
            ]);
            this.assert.deepStrictEqual(setup.client.sentMessages, [
                {act: GameConst.RECONNECT, player: setup.playerSchema, prev: currentRoomName}
            ]);
            this.assert.deepStrictEqual(setup.removedBodies, [setup.playerBody]);
            this.assert.deepStrictEqual(setup.loadedRooms, [townRoom.roomName]);
            this.assert.strictEqual(setup.playerBody.isChangingScene, true);
        });
    }

    async testReturnPointWithoutPreviousRoomIsUsedFromAnyRoom()
    {
        await this.test('a return point without previous room is used coming from any room', async () => {
            let forestRoom = this.roomBuilder.forestRoom;
            let setup = this.roomBuilder.build();
            await this.changeScene(setup, forestRoom.roomName);
            let returnPoint = [...forestRoom.returnPoints].shift();
            this.assert.deepStrictEqual(setup.playerSchema.state, {
                scene: forestRoom.roomName,
                room_id: forestRoom.roomId,
                x: returnPoint.x,
                y: returnPoint.y,
                dir: returnPoint.d
            });
            this.assert.strictEqual(setup.broadcasts.length, 2);
        });
    }

    async testPlayedTimeIsSentOnlyWhenShownToAllPlayers()
    {
        await this.test('the played time is broadcast only when it is shown to all the players', async () => {
            let expectedPlayedTimes = [
                {showPlayedTime: GameConst.SHOW_PLAYER_TIME.ALL_PLAYERS, playedTime: 120},
                {showPlayedTime: GameConst.SHOW_PLAYER_TIME.ONLY_OWN_PLAYER, playedTime: -1},
                {showPlayedTime: GameConst.SHOW_PLAYER_TIME.NONE, playedTime: -1}
            ];
            for(let expectedPlayedTime of expectedPlayedTimes){
                let setup = this.roomBuilder.build({showPlayedTime: expectedPlayedTime.showPlayedTime});
                await this.changeScene(setup, this.roomBuilder.forestRoom.roomName);
                this.assert.strictEqual([...setup.broadcasts].pop().playedTime, expectedPlayedTime.playedTime);
            }
        });
    }

    async testMissingNextRoomCancelsTheSceneChange()
    {
        await this.test('a next room not found cancels the scene change without the client change', async () => {
            let setup = this.roomBuilder.build();
            await this.changeScene(setup, 'missing-room');
            this.assertSceneChangeCancelled(setup);
            this.assert.deepStrictEqual(setup.savedPatches, []);
        });
    }

    async testNextRoomWithoutReturnPointsCancelsTheSceneChange()
    {
        await this.test('a next room without return points cancels the scene change', async () => {
            let setup = this.roomBuilder.build();
            await this.changeScene(setup, this.roomBuilder.noReturnPointsRoom.roomName);
            this.assertSceneChangeCancelled(setup);
            this.assert.deepStrictEqual(setup.savedPatches, []);
        });
    }

    async testNoReturnPointForThePreviousRoomCancelsTheSceneChange()
    {
        await this.test('a next room without a return point for the previous room cancels the scene change', async () => {
            let setup = this.roomBuilder.build();
            await this.changeScene(setup, this.roomBuilder.otherPathRoom.roomName);
            this.assertSceneChangeCancelled(setup);
            this.assert.deepStrictEqual(setup.savedPatches, []);
        });
    }

    async testFailedStateSaveRestoresTheState()
    {
        await this.test('a failed state save restores the state and never starts the client change', async () => {
            let setup = this.roomBuilder.build({saveResult: false});
            await this.changeScene(setup, this.roomBuilder.forestRoom.roomName);
            this.assert.strictEqual(setup.savedPatches.length, 1);
            this.assert.strictEqual([...setup.savedPatches].shift().patch.room_id, this.roomBuilder.forestRoom.roomId);
            this.assertSceneChangeCancelled(setup);
        });
    }

    async testRejectedStateSaveRestoresTheState()
    {
        await this.test('a rejected state save restores the state and never starts the client change', async () => {
            let setup = this.roomBuilder.build({saveRejects: true});
            await this.changeScene(setup, this.roomBuilder.forestRoom.roomName);
            this.assert.strictEqual(setup.savedPatches.length, 1);
            this.assertSceneChangeCancelled(setup);
        });
    }

    async testSaveSkippedByAListenerContinuesTheSceneChange()
    {
        await this.test('a state save skipped by a listener continues the scene change without storing it', async () => {
            let forestRoom = this.roomBuilder.forestRoom;
            let setup = this.roomBuilder.build({skipSave: true});
            await this.changeScene(setup, forestRoom.roomName);
            this.assert.deepStrictEqual(setup.savedPatches, []);
            this.assert.strictEqual(setup.playerSchema.state.scene, forestRoom.roomName);
            this.assert.deepStrictEqual(
                setup.broadcasts.map(broadcast => broadcast.act),
                [GameConst.CHANGING_SCENE, GameConst.CHANGED_SCENE]
            );
            this.assert.strictEqual(setup.client.sentMessages.length, 1);
        });
    }

    async testMissingPlayerIsNotChanged()
    {
        await this.test('a scene change of a player not in the room loads nothing and sends nothing', async () => {
            let setup = this.roomBuilder.build({withPlayer: false});
            await this.changeScene(setup, this.roomBuilder.forestRoom.roomName);
            this.assert.deepStrictEqual(setup.loadedRooms, []);
            this.assert.deepStrictEqual(setup.savedPatches, []);
            this.assert.deepStrictEqual(setup.broadcasts, []);
            this.assert.deepStrictEqual(setup.client.sentMessages, []);
            this.assert.deepStrictEqual(setup.playerSchema.state, setup.initialState);
        });
    }

}

module.exports.TestSceneChangePoint = TestSceneChangePoint;
