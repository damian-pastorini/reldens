/**
 *
 * Reldens - Test Chat Joined Line
 *
 * Tests the chat joined line of the scene message actions: the first client joined message of a player room join
 * broadcasts and stores one joined line, a repeated client joined message of the same join is ignored, and a new player
 * schema (the next room join) gets its own line.
 *
 */

const { BaseTest } = require('./base-test');
const { GameplayPlayerBuilder } = require('./fixtures/gameplay-player-builder');
const { ChatMessageActions } = require('../lib/chat/server/message-actions');
const { ChatConst } = require('../lib/chat/constants');
const { GameConst } = require('../lib/game/constants');

class TestChatJoinedLine extends BaseTest
{

    createSetup()
    {
        let setup = {broadcasted: [], saved: []};
        setup.messageActions = new ChatMessageActions({dataServer: {getEntity: () => ({})}});
        setup.messageActions.chatManager = {saveMessage: async (...savedData) => setup.saved.push(savedData)};
        setup.room = {
            roomName: 'reldens-forest',
            roomData: {roomTitle: 'Forest'},
            config: {get: () => true},
            broadcast: (type, message) => setup.broadcasted.push(message)
        };
        return setup;
    }

    createPlayerSchema()
    {
        let playerSchema = GameplayPlayerBuilder.createPlayerSchema({});
        playerSchema.playerName = 'ImRoot';
        playerSchema.state = {room_id: 4};
        return playerSchema;
    }

    async testJoinedLineOncePerRoomJoin()
    {
        await this.test('a repeated client joined message of the same room join adds no joined line, a new join adds one', async () => {
            let setup = this.createSetup();
            let joinedMessage = {act: GameConst.CLIENT_JOINED};
            let firstJoin = this.createPlayerSchema();
            for(let sentCount = 0; sentCount < 3; sentCount++){
                await setup.messageActions.executeMessageActions({}, joinedMessage, setup.room, firstJoin);
            }
            await setup.messageActions.executeMessageActions({}, joinedMessage, setup.room, this.createPlayerSchema());
            this.assert.deepStrictEqual(
                setup.broadcasted.map(message => message[ChatConst.TYPES.KEY]),
                [ChatConst.TYPES.SYSTEM, ChatConst.TYPES.SYSTEM]
            );
            this.assert.deepStrictEqual(
                setup.saved.map(savedData => [savedData[1], savedData[2], savedData[4]]),
                [[7, 4, ChatConst.TYPES.JOINED], [7, 4, ChatConst.TYPES.JOINED]]
            );
        });
    }

}

module.exports.TestChatJoinedLine = TestChatJoinedLine;
