/**
 *
 * Reldens - Test Teleport Object
 *
 */

const { BaseTest } = require('./base-test');
const { RelocationRoomBuilder } = require('./fixtures/relocation-room-builder');
const { RandomMovementBodyBuilder } = require('./fixtures/random-movement-body-builder');
const { TeleportObject } = require('../lib/objects/server/object/type/teleport-object');
const { ObjectRandomMovement } = require('../lib/objects/server/object/object-random-movement');
const { ObjectsManager } = require('../lib/objects/server/manager');
const { ObjectsConst } = require('../lib/objects/constants');
const { GameConst } = require('../lib/game/constants');
const { sc } = require('@reldens/utils');

class TestTeleportObject extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.roomBuilder = new RelocationRoomBuilder();
        this.bodyBuilder = new RandomMovementBodyBuilder();
        this.interactionDistance = 64;
        this.teleportId = 43;
        this.invalidRoomName = 'reldens-invalid-room';
        this.positionDestination = {room: this.roomBuilder.forestRoom.roomName, x: 300, y: 200, dir: GameConst.LEFT};
    }

    createTeleport(playerState, extraPrivateParams = {})
    {
        let teleport = new TeleportObject({
            events: {},
            config: {get: () => this.interactionDistance, getWithoutLogs: (path, defaultValue) => defaultValue},
            dataServer: {},
            client_key: 'teleport_master_1',
            id: this.teleportId,
            private_params: sc.toJsonString(Object.assign({
                destinations: {
                    '1': {room: this.roomBuilder.forestRoom.roomName},
                    '2': {room: this.invalidRoomName},
                    '4': this.positionDestination,
                    '5': {room: this.roomBuilder.forestRoom.roomId}
                }
            }, extraPrivateParams)),
            client_params: sc.toJsonString({
                content: 'Where would you like to go?',
                options: {
                    '1': {label: 'Forest', value: 1},
                    '2': {label: 'Invalid', value: 2},
                    '3': {label: 'Nowhere', value: 3},
                    '4': {label: 'Forest gate', value: 4},
                    '5': {label: 'Room by id', value: 5}
                }
            })
        });
        teleport.setupInteractionArea(false, playerState.x, playerState.y);
        return teleport;
    }

    async selectOption(setup, optionKey, extraPrivateParams = {})
    {
        return await this.createTeleport(setup.playerSchema.state, extraPrivateParams).executeMessageActions(
            setup.client,
            {act: GameConst.BUTTON_OPTION, id: this.teleportId, value: optionKey},
            setup.room,
            setup.playerSchema
        );
    }

    async testDestinationOptionRelocatesThePlayer()
    {
        await this.test('a destination option closes the dialog and relocates the player to its room', async () => {
            let setup = this.roomBuilder.build(this.roomBuilder.townRoom.roomName);
            this.assert.strictEqual(await this.selectOption(setup, '1'), true);
            this.assert.strictEqual(setup.playerSchema.state.scene, this.roomBuilder.forestRoom.roomName);
            this.assert.deepStrictEqual(
                [...setup.client.sentMessages].pop(),
                {act: GameConst.CLOSE_UI_ACTION, id: this.teleportId}
            );
        });
    }

    async testOptionWithoutDestinationOnlyClosesTheDialog()
    {
        await this.test('an option without destination closes the dialog and keeps the player', async () => {
            let setup = this.roomBuilder.build(this.roomBuilder.townRoom.roomName);
            this.assert.strictEqual(await this.selectOption(setup, '3'), false);
            this.assert.strictEqual(setup.playerSchema.state.scene, this.roomBuilder.townRoom.roomName);
            this.assert.deepStrictEqual(setup.loadedRooms, []);
            this.assert.deepStrictEqual(
                [...setup.client.sentMessages].pop(),
                {act: GameConst.CLOSE_UI_ACTION, id: this.teleportId}
            );
        });
    }

    async testInvalidDestinationRoomIsRejected()
    {
        await this.test('a destination room the player can not enter is rejected with the invalid message', async () => {
            let setup = this.roomBuilder.build(this.roomBuilder.townRoom.roomName);
            this.assert.strictEqual(await this.selectOption(setup, '2'), false);
            this.assert.deepStrictEqual(setup.loadedRooms, []);
            this.assert.deepStrictEqual([...setup.client.sentMessages].pop(), {
                act: GameConst.UI,
                id: this.teleportId,
                content: ObjectsConst.DEFAULTS.TELEPORT_OBJECT.INVALID_DESTINATION_MESSAGE
            });
        });
    }

    async testUnknownOptionIsRejected()
    {
        await this.test('an option that is not in the dialog options never relocates the player', async () => {
            let setup = this.roomBuilder.build(this.roomBuilder.townRoom.roomName);
            this.assert.strictEqual(await this.selectOption(setup, '9'), false);
            this.assert.deepStrictEqual(setup.loadedRooms, []);
        });
    }

    async testNumericOptionValueRelocatesThePlayer()
    {
        await this.test('a numeric option value relocates the player to the destination of its key', async () => {
            let setup = this.roomBuilder.build(this.roomBuilder.townRoom.roomName);
            this.assert.strictEqual(await this.selectOption(setup, 1), true);
            this.assert.strictEqual(setup.playerSchema.state.scene, this.roomBuilder.forestRoom.roomName);
        });
    }

    async testDestinationPositionIsUsed()
    {
        await this.test('a destination with position and direction places the player on them', async () => {
            let setup = this.roomBuilder.build(this.roomBuilder.townRoom.roomName);
            this.assert.strictEqual(await this.selectOption(setup, '4'), true);
            this.assert.deepStrictEqual(setup.playerSchema.state, {
                scene: this.positionDestination.room,
                room_id: this.roomBuilder.forestRoom.roomId,
                x: this.positionDestination.x,
                y: this.positionDestination.y,
                dir: this.positionDestination.dir
            });
        });
    }

    async testDestinationRoomThatIsNotAStringIsRejected()
    {
        await this.test('a destination room that is not a room name is rejected with the invalid message', async () => {
            let setup = this.roomBuilder.build(this.roomBuilder.townRoom.roomName);
            this.assert.strictEqual(await this.selectOption(setup, '5'), false);
            this.assert.deepStrictEqual(setup.loadedRooms, []);
            this.assert.strictEqual(
                [...setup.client.sentMessages].pop().content,
                ObjectsConst.DEFAULTS.TELEPORT_OBJECT.INVALID_DESTINATION_MESSAGE
            );
        });
    }

    async testCustomInvalidDestinationMessageReplacesTheDefault()
    {
        await this.test('a custom invalid destination message replaces the default one', async () => {
            let setup = this.roomBuilder.build(this.roomBuilder.townRoom.roomName);
            let customMessage = 'This road is closed.';
            this.assert.strictEqual(await this.selectOption(setup, '5', {invalidDestinationMessage: customMessage}), false);
            this.assert.deepStrictEqual(setup.loadedRooms, []);
            this.assert.strictEqual([...setup.client.sentMessages].pop().content, customMessage);
        });
    }

    async testDeadOrDisabledPlayerIsNotRelocated()
    {
        await this.test('a dead or disabled player gets the dialog closed and is never relocated', async () => {
            for(let inState of [GameConst.STATUS.DEATH, GameConst.STATUS.DISABLED]){
                let setup = this.roomBuilder.build(this.roomBuilder.townRoom.roomName, {inState});
                this.assert.strictEqual(await this.selectOption(setup, '1'), false);
                this.assert.deepStrictEqual(setup.loadedRooms, []);
                this.assert.strictEqual(setup.savedStates, 0);
                this.assert.strictEqual(setup.playerSchema.state.scene, this.roomBuilder.townRoom.roomName);
                this.assert.deepStrictEqual(
                    [...setup.client.sentMessages].pop(),
                    {act: GameConst.CLOSE_UI_ACTION, id: this.teleportId}
                );
            }
        });
    }

    async testOverlappingOptionClicksRelocateOnce()
    {
        await this.test('two overlapping destination option clicks relocate the player once', async () => {
            let setup = this.roomBuilder.build(this.roomBuilder.townRoom.roomName);
            let teleport = this.createTeleport(setup.playerSchema.state);
            let optionMessage = {act: GameConst.BUTTON_OPTION, id: this.teleportId, value: '1'};
            let results = await Promise.all([
                teleport.executeMessageActions(setup.client, optionMessage, setup.room, setup.playerSchema),
                teleport.executeMessageActions(setup.client, optionMessage, setup.room, setup.playerSchema)
            ]);
            this.assert.deepStrictEqual(results, [true, false]);
            this.assert.strictEqual(setup.savedStates, 1);
            this.assert.strictEqual(setup.broadcasts.length, 1);
            this.assert.strictEqual(setup.sceneChanges.length, 1);
        });
    }

    async testOptionAtTheInteractionsDistanceEdges()
    {
        await this.test('an option just inside the interactions distance relocates and just outside is refused', async () => {
            for(let [offset, expectedScene] of [
                [this.interactionDistance - 1, this.roomBuilder.forestRoom.roomName],
                [this.interactionDistance, this.roomBuilder.townRoom.roomName]
            ]){
                let setup = this.roomBuilder.build(this.roomBuilder.townRoom.roomName);
                let teleport = this.createTeleport(setup.playerSchema.state);
                setup.playerSchema.state.x += offset;
                let result = await teleport.executeMessageActions(
                    setup.client,
                    {act: GameConst.BUTTON_OPTION, id: this.teleportId, value: '1'},
                    setup.room,
                    setup.playerSchema
                );
                this.assert.strictEqual(result, this.roomBuilder.forestRoom.roomName === expectedScene);
                this.assert.strictEqual(setup.playerSchema.state.scene, expectedScene);
                this.assert.deepStrictEqual(
                    [...setup.client.sentMessages].pop(),
                    {act: GameConst.CLOSE_UI_ACTION, id: this.teleportId}
                );
            }
        });
    }

    createMovingTeleport(playerState)
    {
        let teleport = this.createTeleport(playerState);
        teleport.state = {x: playerState.x, y: playerState.y};
        teleport.randomMovementBehavior = new ObjectRandomMovement({
            objectBody: this.bodyBuilder.build(),
            getInBattlePlayers: () => ({})
        });
        return teleport;
    }

    async sendTeleportMessage(teleport, setup, client, message)
    {
        return await teleport.executeMessageActions(
            client,
            Object.assign({id: this.teleportId}, message),
            setup.room,
            setup.playerSchema
        );
    }

    async testMovingTeleportStopsForTheDialogAndMovesAfterNowhere()
    {
        await this.test('a moving teleport NPC stops while its dialog is open and moves again after Nowhere', async () => {
            let setup = this.roomBuilder.build(this.roomBuilder.townRoom.roomName);
            let teleport = this.createMovingTeleport(setup.playerSchema.state);
            await this.sendTeleportMessage(teleport, setup, setup.client, {act: ObjectsConst.OBJECT_INTERACTION});
            this.assert.strictEqual(teleport.randomMovementBehavior.moveToRandomTile(), false);
            this.assert.strictEqual(
                await this.sendTeleportMessage(teleport, setup, setup.client, {act: GameConst.BUTTON_OPTION, value: '3'}),
                false
            );
            this.assert.notStrictEqual(teleport.randomMovementBehavior.moveToRandomTile(), false);
        });
    }

    async testMovingTeleportMovesAgainOnceTheTeleportedPlayerLeft()
    {
        await this.test('a moving teleport NPC moves again only once the teleported player left the room', async () => {
            let setup = this.roomBuilder.build(this.roomBuilder.townRoom.roomName);
            let teleport = this.createMovingTeleport(setup.playerSchema.state);
            let objectsManager = new ObjectsManager({config: {}, events: {}, dataServer: {}});
            objectsManager.roomObjects = {[teleport.key]: teleport};
            await this.sendTeleportMessage(teleport, setup, setup.client, {act: ObjectsConst.OBJECT_INTERACTION});
            this.assert.strictEqual(
                await this.sendTeleportMessage(teleport, setup, setup.client, {act: GameConst.BUTTON_OPTION, value: '1'}),
                true
            );
            this.assert.strictEqual(teleport.randomMovementBehavior.moveToRandomTile(), false);
            objectsManager.resumeObjectsMovementAfterInteraction(setup.client.sessionId);
            this.assert.notStrictEqual(teleport.randomMovementBehavior.moveToRandomTile(), false);
        });
    }

    async testMovingTeleportWaitsForEveryOpenDialog()
    {
        await this.test('a moving teleport NPC with two open dialogs moves again only when both are closed', async () => {
            let setup = this.roomBuilder.build(this.roomBuilder.townRoom.roomName);
            let teleport = this.createMovingTeleport(setup.playerSchema.state);
            let otherClient = {sessionId: 'session-8', send: () => true};
            await this.sendTeleportMessage(teleport, setup, setup.client, {act: ObjectsConst.OBJECT_INTERACTION});
            await this.sendTeleportMessage(teleport, setup, otherClient, {act: ObjectsConst.OBJECT_INTERACTION});
            await this.sendTeleportMessage(teleport, setup, setup.client, {act: GameConst.BUTTON_OPTION, value: '3'});
            this.assert.strictEqual(teleport.randomMovementBehavior.moveToRandomTile(), false);
            await this.sendTeleportMessage(teleport, setup, otherClient, {act: GameConst.CLOSE_UI_ACTION});
            this.assert.notStrictEqual(teleport.randomMovementBehavior.moveToRandomTile(), false);
        });
    }

    async testInteractionOpensTheDestinationsDialog()
    {
        await this.test('the interaction opens the dialog with the destinations options', async () => {
            let setup = this.roomBuilder.build(this.roomBuilder.townRoom.roomName);
            let teleport = this.createTeleport(setup.playerSchema.state);
            await teleport.executeMessageActions(
                setup.client,
                {act: ObjectsConst.OBJECT_INTERACTION, id: this.teleportId},
                setup.room,
                setup.playerSchema
            );
            let dialogMessage = [...setup.client.sentMessages].pop();
            this.assert.strictEqual(dialogMessage.act, GameConst.UI);
            this.assert.deepStrictEqual(dialogMessage.options, teleport.options);
            this.assert.strictEqual(teleport.type, ObjectsConst.TYPE_TELEPORT);
            this.assert.deepStrictEqual(setup.loadedRooms, []);
        });
    }

}

module.exports.TestTeleportObject = TestTeleportObject;
