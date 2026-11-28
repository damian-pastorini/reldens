/**
 *
 * Reldens - Test Player Trade Exchanges
 *
 * Tests the player trades of the InventoryMessageActions with the trade fixtures: a trade is never accepted without an
 * invite from the starter, an invite is accepted once (also two accepts sent in the same tick, the invite is consumed
 * before anything is awaited), and a trade action needs a trade in progress and names its own partner (a trade action
 * naming the sender itself or a player of another exchange is refused with no update and no cancel). A player keeps one
 * exchange at a time (ISSUE #358): with server/players/exchanges/newCancelsActive off a locked inviter or invited player
 * refuses the trade invite, and a locked player refuses the accept, which consumes the invite and cancels the pending
 * exchange (never a trade the starter is already running, like a crossed second accept); with it on the accept cancels
 * the exchanges in progress of every locked player first (the cancel unlocks their inventories) and then starts the
 * trade, unless the starter replaced its invited exchange meanwhile; the Processor refuses a new exchange only with the option off and a locked player. A
 * player that accepts another invite cancels its own pending invite (ISSUE #475): the old invited player accept and
 * decline are refused while the new trade runs and after it closed, initializing and cancelling nothing of it. The
 * invited player has no trade in progress (the player schema gets one only on its first trade).
 *
 */

const { BaseTest } = require('./base-test');
const { PlayerTradeBuilder } = require('./fixtures/player-trade-builder');
const { InventoryMessageActions } = require('../lib/inventory/server/message-actions');
const { Processor } = require('../lib/inventory/server/exchange/processor');
const { InventoryConst } = require('../lib/inventory/constants');
const { ObjectsConst } = require('../lib/objects/constants');
const { sc } = require('@reldens/utils');

class TestPlayerTradeExchanges extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.tradeBuilder = new PlayerTradeBuilder();
        this.acceptData = {act: InventoryConst.ACTIONS.TRADE_ACCEPTED, value: '1', id: 'session1'};
    }

    createAcceptSetup(lockedSessionIds, newExchangeCancelsActive)
    {
        let setup = {sentMessages: [], initializedExchanges: [], cancelledExchanges: [], emittedEvents: []};
        setup.tradeInProgress = this.tradeBuilder.createTradeInProgress(setup.initializedExchanges, setup.cancelledExchanges);
        setup.starterPlayer = this.tradeBuilder.createTradePlayer(
            'session1',
            setup.tradeInProgress,
            -1 !== lockedSessionIds.indexOf('session1')
        );
        setup.starterPlayer.tradeInvitedSessionId = 'session2';
        setup.invitedPlayer = this.tradeBuilder.createTradePlayer('session2', false, -1 !== lockedSessionIds.indexOf('session2'));
        setup.room = this.tradeBuilder.createTradeRoom(setup.starterPlayer, setup.sentMessages, setup.emittedEvents);
        setup.client = {send: (type, message) => setup.sentMessages.push(message)};
        setup.messageActions = new InventoryMessageActions(newExchangeCancelsActive);
        setup.accept = async () => await setup.messageActions.startExchange(
            setup.client,
            this.acceptData,
            setup.room,
            setup.invitedPlayer
        );
        setup.acceptWithState = async () => [
            await setup.accept(),
            setup.starterPlayer.tradeInvitedSessionId,
            setup.cancelledExchanges,
            setup.initializedExchanges
        ];
        return setup;
    }

    async testTradeAcceptWithoutInviteIsRejected()
    {
        await this.test('a trade cannot be accepted without an invite from the starter', async () => {
            let setup = this.createAcceptSetup([], false);
            setup.starterPlayer.tradeInvitedSessionId = 'session3';
            this.assert.deepStrictEqual(
                [await setup.accept(), setup.initializedExchanges, setup.sentMessages],
                [false, [], []]
            );
        });
    }

    async testTheTradeInviteIsNotReusableAfterTheAccept()
    {
        await this.test('a trade invite cannot be accepted a second time', async () => {
            let setup = this.createAcceptSetup([], false);
            this.assert.deepStrictEqual(
                [await setup.accept(), await setup.accept(), setup.initializedExchanges.length],
                [true, false, 1]
            );
        });
    }

    async testTradeActionWithoutTradeInProgressIsRejected()
    {
        await this.test('a trade action without a trade in progress is rejected', async () => {
            let sentMessages = [];
            let data = {act: InventoryConst.ACTIONS.TRADE_ACTION, sub: ObjectsConst.TRADE_ACTIONS.ADD, id: 'session1'};
            let result = await new InventoryMessageActions().runTradeAction(
                {send: (type, message) => sentMessages.push(message)},
                data,
                this.tradeBuilder.createTradeRoom(false, sentMessages),
                {sessionId: 'session2', tradeInProgress: null}
            );
            this.assert.deepStrictEqual([result, sentMessages], [false, []]);
        });
    }

    async testATradeActionNamingTheSenderOrAnotherExchangePlayerIsRefused()
    {
        await this.test('a trade action naming the sender or a player of another exchange is refused with no update', async () => {
            let sentMessages = [];
            let cancelledExchanges = [];
            let senderTrade = this.tradeBuilder.createTradeInProgress([], cancelledExchanges);
            senderTrade.inventories = {A: {owner: {sessionId: 'session1'}}, B: {owner: {sessionId: 'session2'}}};
            let sender = this.tradeBuilder.createTradePlayer('session2', senderTrade);
            let otherExchangePlayer = this.tradeBuilder.createTradePlayer(
                'session3',
                this.tradeBuilder.createTradeInProgress([], cancelledExchanges)
            );
            let results = [];
            for(let namedPlayer of [sender, otherExchangePlayer]){
                results.push(await new InventoryMessageActions().runTradeAction(
                    {send: (type, message) => sentMessages.push(message)},
                    {act: InventoryConst.ACTIONS.TRADE_ACTION, sub: ObjectsConst.TRADE_ACTIONS.ADD, id: namedPlayer.sessionId},
                    this.tradeBuilder.createTradeRoom(namedPlayer, sentMessages),
                    sender
                ));
            }
            this.assert.deepStrictEqual([results, sentMessages, cancelledExchanges], [[false, false], [], []]);
        });
    }

    async testALockedPlayerRefusesTheTradeInvite()
    {
        await this.test('with the new exchange cancel off a locked inviter or invited player refuses the trade invite', async () => {
            for(let lockedSessionId of ['session1', 'session2']){
                let setup = this.createAcceptSetup([lockedSessionId], false);
                setup.starterPlayer.tradeInProgress = false;
                setup.room.playerBySessionIdFromState = () => setup.invitedPlayer;
                let isStarted = setup.messageActions.tryExchangeStart(
                    setup.client,
                    {act: InventoryConst.ACTIONS.TRADE_START, id: 'session2'},
                    setup.room,
                    setup.starterPlayer
                );
                this.assert.deepStrictEqual(
                    [isStarted, setup.starterPlayer.tradeInProgress, setup.sentMessages],
                    [false, false, []],
                    'Locked player '+lockedSessionId
                );
            }
        });
    }

    async testALockedPlayerRefusesTheAcceptAndConsumesTheInvite()
    {
        await this.test('with the new exchange cancel off a locked player refuses the accept, the invite is consumed and the pending exchange cancelled', async () => {
            for(let lockedSessionId of ['session1', 'session2']){
                let setup = this.createAcceptSetup([lockedSessionId], false);
                this.assert.deepStrictEqual(
                    [...await setup.acceptWithState(), setup.emittedEvents, setup.sentMessages],
                    [false, false, [true], [], [], []],
                    'Locked player '+lockedSessionId
                );
            }
        });
    }

    async testTwoAcceptsInTheSameTickStartTheTradeOnce()
    {
        await this.test('two accepts of the same invite sent in the same tick start the trade once', async () => {
            let setup = this.createAcceptSetup([], false);
            this.assert.deepStrictEqual(
                [await Promise.all([setup.accept(), setup.accept()]), setup.initializedExchanges.length],
                [[true, false], 1]
            );
        });
    }

    async testARefusedAcceptNeverCancelsTheRunningTrade()
    {
        await this.test('a refused crossed accept never cancels the trade the starter is already running', async () => {
            let setup = this.createAcceptSetup(['session1', 'session2'], false);
            setup.tradeInProgress.inventories = {A: {owner: {sessionId: 'session1'}}, B: {owner: {sessionId: 'session2'}}};
            this.assert.deepStrictEqual(await setup.acceptWithState(), [false, false, [], []]);
        });
    }

    async testAnInvitedExchangeReplacedDuringTheCancelStopsTheAccept()
    {
        await this.test('an accept whose starter replaced its invited exchange while the other exchanges were cancelled starts nothing', async () => {
            let setup = this.createAcceptSetup(['session2'], true);
            let otherExchange = this.tradeBuilder.createTradeInProgress([]);
            setup.room.events.emit = async (eventKey, eventData) => {
                setup.emittedEvents.push({eventKey, eventData});
                setup.starterPlayer.tradeInProgress = otherExchange;
            };
            this.assert.deepStrictEqual(
                [
                    await setup.accept(),
                    setup.emittedEvents.length,
                    setup.initializedExchanges,
                    sc.hasOwn(setup.invitedPlayer, 'tradeInProgress')
                ],
                [false, 1, [], false]
            );
        });
    }

    createOldInviteSetup()
    {
        let setup = {sentMessages: [], initializedAB: [], cancelledAB: [], initializedCA: [], cancelledCA: []};
        setup.exchangeCA = this.tradeBuilder.createTradeInProgress(setup.initializedCA, setup.cancelledCA);
        setup.playerA = this.tradeBuilder.createTradePlayer(
            'session1',
            this.tradeBuilder.createTradeInProgress(setup.initializedAB, setup.cancelledAB)
        );
        setup.playerA.tradeInvitedSessionId = 'session2';
        setup.playerC = this.tradeBuilder.createTradePlayer('session3', setup.exchangeCA);
        setup.playerC.tradeInvitedSessionId = 'session1';
        setup.playerB = this.tradeBuilder.createTradePlayer('session2', false);
        let playersBySessionId = {session1: setup.playerA, session2: setup.playerB, session3: setup.playerC};
        setup.room = this.tradeBuilder.createTradeRoom(false, setup.sentMessages);
        setup.room.playerBySessionIdFromState = (sessionId) => playersBySessionId[sessionId];
        setup.client = {send: (type, message) => setup.sentMessages.push(message)};
        setup.messageActions = new InventoryMessageActions(false);
        setup.oldInviteData = {act: InventoryConst.ACTIONS.TRADE_ACCEPTED, value: '1', id: 'session1'};
        return setup;
    }

    async testTheOldInviteOfAPlayerThatAcceptedAnotherTradeIsRefused()
    {
        await this.test('a player that accepts another invite drops its own invite, so the old invited player can neither join nor cancel that trade, live or closed', async () => {
            let setup = this.createOldInviteSetup();
            this.assert.deepStrictEqual(
                [
                    await setup.messageActions.startExchange(
                        setup.client,
                        {act: InventoryConst.ACTIONS.TRADE_ACCEPTED, value: '1', id: 'session3'},
                        setup.room,
                        setup.playerA
                    ),
                    setup.playerA.tradeInvitedSessionId,
                    [...setup.cancelledAB],
                    await setup.messageActions.startExchange(setup.client, setup.oldInviteData, setup.room, setup.playerB),
                    setup.messageActions.declineExchange(setup.oldInviteData, setup.room, setup.playerB),
                    [...setup.cancelledCA],
                    setup.messageActions.closeTradeAction(setup.client, {id: 'trade-close'}, setup.room, setup.playerC),
                    await setup.messageActions.startExchange(setup.client, setup.oldInviteData, setup.room, setup.playerB),
                    setup.messageActions.declineExchange(setup.oldInviteData, setup.room, setup.playerB),
                    setup.initializedCA.length,
                    setup.initializedAB,
                    setup.cancelledCA,
                    setup.cancelledAB,
                    sc.hasOwn(setup.playerB, 'tradeInProgress'),
                    setup.playerA.tradeInProgress === setup.exchangeCA
                ],
                [true, false, [true], false, false, [], true, false, false, 1, [], [true], [true], false, true]
            );
        });
    }

    async testTheAcceptCancelsTheActiveExchangesOfTheLockedPlayers()
    {
        await this.test('with the new exchange cancel on the accept cancels the exchanges of every locked player and starts the trade', async () => {
            let setup = this.createAcceptSetup(['session1', 'session2'], true);
            setup.room.events.emit = async (eventKey, eventData) => {
                setup.emittedEvents.push({eventKey, eventData});
                eventData.playerSchema.inventory.manager.locked = false;
            };
            this.assert.deepStrictEqual(
                [
                    await setup.accept(),
                    setup.emittedEvents.map(emitted => [emitted.eventKey, emitted.eventData.playerSchema.sessionId]),
                    setup.initializedExchanges.length,
                    setup.invitedPlayer.tradeInProgress === setup.tradeInProgress
                ],
                [
                    true,
                    [['reldens.cancelPlayerExchanges', 'session1'], ['reldens.cancelPlayerExchanges', 'session2']],
                    1,
                    true
                ]
            );
        });
    }

    async testTheProcessorRefusesANewExchangeOnlyWithTheOptionOffAndALockedPlayer()
    {
        await this.test('the processor refuses a new exchange only with the option off and a locked player, and cancels nothing with it off', async () => {
            let lockedPlayer = this.tradeBuilder.createTradePlayer('session1', false, true);
            let freePlayer = this.tradeBuilder.createTradePlayer('session2', false, false);
            let emittedEvents = [];
            let room = this.tradeBuilder.createTradeRoom(false, [], emittedEvents);
            this.assert.deepStrictEqual(
                [
                    Processor.isNewExchangeRefused([freePlayer], false),
                    Processor.isNewExchangeRefused([freePlayer, lockedPlayer], false),
                    Processor.isNewExchangeRefused([freePlayer, lockedPlayer], true),
                    await Processor.cancelActiveExchanges(room, [freePlayer, lockedPlayer], false),
                    emittedEvents
                ],
                [false, true, false, false, []]
            );
        });
    }

}

module.exports.TestPlayerTradeExchanges = TestPlayerTradeExchanges;
