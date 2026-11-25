/**
 *
 * Reldens - Test Private Message Cross Server Relay
 *
 * Tests the private messages between two chat servers wired through the fetch route dispatcher: a message to a player
 * on the other server is delivered there and saved with that recipient id, a player on no server gives the not found
 * line, a player on the same server is never relayed, and a recipient that is not a valid player name is never relayed
 * (a not string or empty recipient gets no message, a too long name or one with invalid characters gets the not found
 * line); the relayed message is delivered only with a valid text and sender name, cleaned and cut to the
 * chat characters limit, and only for the private message action; and the chat plugin builds the relay from its config
 * and the shared servers values (never without its events, config or servers values) and serves the relay route, where
 * only an unused valid signed request skips the invalid requests limiter (an invalid or already used one reaches it).
 *
 */

const { BaseTest } = require('./base-test');
const { RoomChat } = require('../lib/chat/server/room-chat');
const { ChatConst } = require('../lib/chat/constants');
const { UsersConst } = require('../lib/users/constants');
const { MessageFactory } = require('../lib/chat/message-factory');
const { PrivateMessageCrossServerRelay } = require('../lib/chat/server/private-message-cross-server-relay');
const { ChatPlugin } = require('../lib/chat/server/plugin');
const { FetchStubRouteDispatcher } = require('./fixtures/fetch-stub-route-dispatcher');
const { GlobalFetchStub } = require('./fixtures/global-fetch-stub');
const { ServerMessengerPropsBuilder } = require('./fixtures/server-messenger-props-builder');
const { GameplayPlayerBuilder } = require('./fixtures/gameplay-player-builder');
const { sc } = require('@reldens/utils');

class TestPrivateMessageCrossServerRelay extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.firstServerUrl = 'http://server-1:8080';
        this.secondServerUrl = 'http://server-2:8081';
        this.privateSender = {playerName: 'ImRoot2', playerId: 2, playerData: {state: {room_id: 4}}};
        this.characterLimit = 12;
        this.roomsServers = {'reldens-town': this.firstServerUrl, 'reldens-house-2': this.secondServerUrl};
    }

    createChatServer(serverSelfUrl, playersByName, sent)
    {
        let relay = new PrivateMessageCrossServerRelay(Object.assign(
            ServerMessengerPropsBuilder.create(serverSelfUrl, this.roomsServers, 'test-secret', ChatConst.SYNC.ROUTE),
            {characterLimit: this.characterLimit, maximumPlayerNameLength: UsersConst.PLAYER_NAME_MAXIMUM_LENGTH}
        ));
        let chatRoom = Object.create(RoomChat.prototype, {roomId: {value: 'chat-room'}});
        chatRoom.activePlayerByPlayerName = (playerName) => sc.get(playersByName, playerName, false);
        chatRoom.chatManager = {saveMessage: async (...savedData) => 0 < sent.savedMessages.push(savedData)};
        chatRoom.privateMessageRelay = relay;
        relay.registerChatRoom(chatRoom);
        let receiveRequest = relay.receiveRequest.bind(relay);
        relay.receiveRequest = async (req) => sent.relayedRequests.push(req.body.targetId) && await receiveRequest(req);
        return {relay, chatRoom};
    }

    async sendPrivateFromFirstServer(playersByServer, toPlayerName)
    {
        let sent = {senderMessages: [], relayedRequests: [], savedMessages: [], result: null};
        let first = this.createChatServer(this.firstServerUrl, playersByServer.first, sent);
        let second = this.createChatServer(this.secondServerUrl, playersByServer.second, sent);
        let routeHandlers = {};
        routeHandlers[this.firstServerUrl] = first.relay;
        routeHandlers[this.secondServerUrl] = second.relay;
        await FetchStubRouteDispatcher.withServers(routeHandlers, async () => {
            sent.result = await first.chatRoom.sendPrivateMessage(
                {send: (type, message) => sent.senderMessages.push(message)},
                toPlayerName,
                '@'+toPlayerName+' hello there',
                this.privateSender
            );
        });
        return sent;
    }

    async testAPrivateMessageToAPlayerOnTheOtherServerIsDelivered()
    {
        await this.test('a private message to a player on the other server is delivered there and saved with its recipient', async () => {
            let receivedMessages = [];
            let sent = await this.sendPrivateFromFirstServer(
                {first: {}, second: {ImRoot: {playerId: 5, client: {send: (type, message) => receivedMessages.push(message)}}}},
                'ImRoot'
            );
            let expectedMessage = MessageFactory.create(ChatConst.TYPES.PRIVATE, ' hello there', {}, 'ImRoot2');
            this.assert.deepStrictEqual(
                [receivedMessages, sent.senderMessages, sent.relayedRequests, sent.savedMessages],
                [
                    [expectedMessage],
                    [expectedMessage],
                    ['ImRoot'],
                    [[expectedMessage[ChatConst.MESSAGE.KEY], 2, 4, 5, ChatConst.TYPES.PRIVATE]]
                ]
            );
        });
    }

    async testAPrivateMessageToAPlayerOnNoServerSendsTheNotFoundLine()
    {
        await this.test('a private message to a player on no server gives the sender the player not found line', async () => {
            let sent = await this.sendPrivateFromFirstServer({first: {}, second: {}}, 'Nobody');
            let notFoundData = {[ChatConst.MESSAGE.DATA.PLAYER_NAME]: 'Nobody'};
            let notFoundSnippet = ChatConst.SNIPPETS.PRIVATE_MESSAGE_PLAYER_NOT_FOUND;
            this.assert.deepStrictEqual(
                [sent.result, sent.senderMessages, sent.relayedRequests, sent.savedMessages],
                [
                    false,
                    [MessageFactory.create(ChatConst.TYPES.ERROR, notFoundSnippet, notFoundData)],
                    ['Nobody'],
                    [[MessageFactory.withDataToJson(notFoundSnippet, notFoundData), 2, 4, false, ChatConst.TYPES.ERROR]]
                ]
            );
        });
    }

    async testAPrivateMessageToAPlayerOnTheSameServerIsNotRelayed()
    {
        await this.test('a private message to a player on the same server is delivered there and never relayed', async () => {
            let receivedMessages = [];
            let sent = await this.sendPrivateFromFirstServer(
                {first: {ImRoot: {playerId: 5, client: {send: (type, message) => receivedMessages.push(message)}}}, second: {}},
                'ImRoot'
            );
            this.assert.deepStrictEqual(
                [receivedMessages.length, sent.senderMessages.length, sent.relayedRequests, sent.savedMessages[0][3]],
                [1, 1, [], 5]
            );
        });
    }

    async testAnInvalidRecipientNameIsRejected()
    {
        await this.test('a recipient that is not a valid player name is never relayed, an invalid name gets the player not found line', async () => {
            let invalidNames = ['a'.repeat(UsersConst.PLAYER_NAME_MAXIMUM_LENGTH + 1), 'Im Root', 'Im<Root'];
            let invalidRecipients = [7, '', ...invalidNames];
            let results = [];
            let sent = {senderMessages: [], relayedRequests: [], savedMessages: []};
            let first = this.createChatServer(this.firstServerUrl, {}, sent);
            for(let invalidRecipient of invalidRecipients){
                results.push(await first.chatRoom.sendPrivateMessage(
                    {send: (type, message) => sent.senderMessages.push(message)},
                    invalidRecipient,
                    '@x hello',
                    this.privateSender
                ));
            }
            let notFoundSnippet = ChatConst.SNIPPETS.PRIVATE_MESSAGE_PLAYER_NOT_FOUND;
            this.assert.deepStrictEqual(
                [results, sent.relayedRequests, sent.senderMessages],
                [
                    new Array(invalidRecipients.length).fill(false),
                    [],
                    invalidNames.map((invalidName) => MessageFactory.create(
                        ChatConst.TYPES.ERROR,
                        notFoundSnippet,
                        {[ChatConst.MESSAGE.DATA.PLAYER_NAME]: invalidName}
                    ))
                ]
            );
        });
    }

    async testTheRelayedMessageIsDeliveredOnlyWhenValid()
    {
        await this.test('a relayed message is delivered only with a valid text and sender, cleaned and cut to the limit', async () => {
            let receivedMessages = [];
            let second = this.createChatServer(
                this.secondServerUrl,
                {ImRoot: {playerId: 5, client: {send: (type, message) => receivedMessages.push(message)}}},
                {senderMessages: [], relayedRequests: [], savedMessages: []}
            );
            let privateAction = ChatConst.SYNC.PRIVATE_MESSAGE;
            let rejectedCases = [
                [privateAction, 'ImRoot', {fromPlayerName: 'ImRoot2', text: 7}],
                [privateAction, 'ImRoot', {fromPlayerName: '', text: 'hi'}],
                [privateAction, 'ImRoot', {fromPlayerName: 7, text: 'hi'}],
                [privateAction, 'ImRoot', {fromPlayerName: 'Im Root2', text: 'hi'}],
                [privateAction, 'ImRoot', {fromPlayerName: 'ImRoot2', text: '<>'}],
                [privateAction, 'Nobody', {fromPlayerName: 'ImRoot2', text: 'hi'}],
                ['anotherAction', 'ImRoot', {fromPlayerName: 'ImRoot2', text: 'hi'}]
            ];
            let answers = [];
            for(let rejectedCase of rejectedCases){
                answers.push(await second.relay.receiveAction(...rejectedCase));
            }
            let deliveredAnswer = await second.relay.receiveAction(
                privateAction,
                'ImRoot',
                {fromPlayerName: 'ImRoot2', text: 'hello <> there friend'}
            );
            let cleanedText = 'hello  there';
            this.assert.deepStrictEqual(
                [answers, deliveredAnswer, receivedMessages, cleanedText.length],
                [
                    [
                        ...new Array(rejectedCases.length - 1).fill({isSuccess: true, toPlayerId: false}),
                        {isSuccess: false, toPlayerId: false}
                    ],
                    {isSuccess: true, toPlayerId: 5},
                    [MessageFactory.create(ChatConst.TYPES.PRIVATE, cleanedText, {}, 'ImRoot2')],
                    this.characterLimit
                ]
            );
        });
    }

    createPluginProps(listeners)
    {
        return {
            events: {on: (eventKey, callback) => listeners[eventKey] = callback},
            dataServer: {getEntity: () => false},
            config: GameplayPlayerBuilder.createConfigManager({
                'client/chat/messages/characterLimit': this.characterLimit
            }),
            serverToServerMessengerProps: ServerMessengerPropsBuilder.createShared(
                this.firstServerUrl,
                this.roomsServers,
                'test-secret'
            )
        };
    }

    async fetchSignedBodyForFirstServer()
    {
        let signedBodies = [];
        let second = this.createChatServer(this.secondServerUrl, {}, {senderMessages: [], relayedRequests: [], savedMessages: []});
        await GlobalFetchStub.withFetch(async (requestUrl, options) => {
            signedBodies.push(sc.parseJson(options.body));
            return {ok: true, json: async () => ({isSuccess: true})};
        }, async () => {
            await second.relay.sendRequest(this.firstServerUrl, ChatConst.SYNC.PRIVATE_MESSAGE, 'ImRoot', {text: 'hi'});
        });
        return [...signedBodies].shift();
    }

    async testTheChatPluginBuildsTheRelayFromItsConfig()
    {
        await this.test('the chat plugin builds the relay from its config and serves its route, never without events, config or servers values', async () => {
            let missingResults = [];
            for(let missingKey of ['events', 'config', 'serverToServerMessengerProps']){
                let listeners = {};
                let props = this.createPluginProps(listeners);
                props[missingKey] = false;
                let missingPlugin = new ChatPlugin();
                await missingPlugin.setup(props);
                missingResults.push([missingPlugin.privateMessageRelay, Object.keys(listeners)]);
            }
            let listeners = {};
            let plugin = new ChatPlugin();
            await plugin.setup(this.createPluginProps(listeners));
            let postedRoutes = [];
            let routeMiddlewares = [];
            let limitedRequests = [];
            let app = {post: (routePath, routeMiddleware, routeHandler) => {
                postedRoutes.push([routePath, typeof routeHandler]);
                routeMiddlewares.push(routeMiddleware);
            }};
            let rateLimitConfigurer = {createHomeLimiter: () => (req) => limitedRequests.push(req.body)};
            listeners['reldens.serverBeforeListen']({serverManager: {app, appServerFactory: {rateLimitConfigurer}}});
            let relay = plugin.privateMessageRelay;
            let signedBody = await this.fetchSignedBodyForFirstServer();
            let passedRequests = [];
            let routeMiddleware = [...routeMiddlewares].shift();
            routeMiddleware({body: {action: 'e2e', targetId: 'ImRoot'}}, {}, () => passedRequests.push('invalid'));
            routeMiddleware({body: signedBody}, {}, () => passedRequests.push('signed'));
            relay.expiringHmacToken.markUsed(signedBody.token, Date.now());
            routeMiddleware({body: signedBody}, {}, () => passedRequests.push('used'));
            this.assert.deepStrictEqual(
                [
                    missingResults,
                    relay instanceof PrivateMessageCrossServerRelay,
                    relay.characterLimit,
                    relay.serverSelfAddress,
                    relay.otherServersUrls,
                    postedRoutes,
                    passedRequests,
                    limitedRequests
                ],
                [
                    [[false, []], [false, []], [false, []]],
                    true,
                    this.characterLimit,
                    this.firstServerUrl,
                    [this.secondServerUrl],
                    [[ChatConst.SYNC.ROUTE, 'function']],
                    ['signed'],
                    [{action: 'e2e', targetId: 'ImRoot'}, signedBody]
                ]
            );
        });
    }

}

module.exports.TestPrivateMessageCrossServerRelay = TestPrivateMessageCrossServerRelay;
