/**
 *
 * Reldens - Test Resurrection Ad Gate
 *
 * Tests the ads ResurrectionAdGate: the resurrection ad start of a dead player is accepted once per death (the ad state
 * is bound to the death event, so a new death starts a new state) when the room allows the message, and holds the
 * death revive up to the ads videos maximum duration; an alive, disabled or missing player and a room refusing the
 * message are rejected; the other messages and ads pass untouched. A stored start refreshes the hold; a rejected start,
 * a failed ad and an end without reward close the ad, release the hold and tell the revive again, a rewarded end closes
 * it and releases the hold without telling. The ad reward sets the choice to use the restoration item and tells the
 * revive. The town revive data offers the ad event key only to a player without restoration item, with the ad not
 * closed, in a room that allows the ad start and end messages.
 *
 */

const { BaseTest } = require('./base-test');
const { GameplayPlayerBuilder } = require('./fixtures/gameplay-player-builder');
const { DeathRelocationBuilder } = require('./fixtures/death-relocation-builder');
const { ResurrectionAdGate } = require('../lib/ads/server/resurrection-ad-gate');
const { RoomScene } = require('../lib/rooms/server/scene');
const { ActionsConst } = require('../lib/actions/constants');
const { AdsConst } = require('../lib/ads/constants');
const { GameConst } = require('../lib/game/constants');

class TestResurrectionAdGate extends BaseTest
{

    constructor(config)
    {
        super(config);
        let deathBuilder = new DeathRelocationBuilder();
        this.resurrectionAd = deathBuilder.resurrectionAd;
        this.otherAd = deathBuilder.otherAd;
        this.maximumDuration = AdsConst.VIDEOS_MAXIMUM_DURATION;
        this.holdKey = ActionsConst.DEATH.PRIVATE_DATA.REVIVE_HOLD_UNTIL;
        this.stateKey = AdsConst.PRIVATE_DATA.RESURRECTION_AD;
    }

    createGate(notified, adsKey = this.resurrectionAd.key, resurrectionAd = this.resurrectionAd)
    {
        return new ResurrectionAdGate({
            events: {emitSync: (eventKey, event) => notified.push([eventKey, event.playerSchema.sessionId])},
            adsKey,
            adsCollection: {[resurrectionAd.id]: resurrectionAd, [this.otherAd.id]: this.otherAd},
            maximumDuration: this.maximumDuration
        });
    }

    createRoom(customData = {})
    {
        let room = Object.create(RoomScene.prototype);
        room.customData = customData;
        return room;
    }

    createEvent(adsId = this.resurrectionAd.id, act = AdsConst.ACTIONS.AD_STARTED, inState = GameConst.STATUS.DEATH)
    {
        let playerSchema = GameplayPlayerBuilder.createPlayerSchema({inState});
        playerSchema.skillsServer.classPath.currentSkills = {};
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.PLAYER_DEATH_EVENT, {targetSchema: playerSchema});
        return {room: this.createRoom(), client: {}, messageData: {act, ads_id: adsId}, playerSchema, canContinue: true};
    }

    createRequestedEvent(gate)
    {
        let event = this.createEvent();
        gate.closeRequestOrHoldRevive(event);
        return event;
    }

    async testDeadPlayerRequestsTheAdOncePerDeath()
    {
        await this.test('a dead player requests the resurrection ad once per death and the revive is held', async () => {
            let notified = [];
            let gate = this.createGate(notified);
            let event = this.createEvent();
            let requestedBefore = Date.now();
            gate.closeRequestOrHoldRevive(event);
            this.assert.strictEqual(event.canContinue, true);
            this.assert.strictEqual(event.playerSchema.getPrivate(this.stateKey).isRequested, true);
            this.assert.strictEqual(event.playerSchema.getPrivate(this.holdKey) >= requestedBefore + this.maximumDuration, true);
            event.canContinue = true;
            gate.closeRequestOrHoldRevive(event);
            this.assert.strictEqual(event.canContinue, false);
            this.assert.deepStrictEqual(notified, []);
        });
    }

    async testNewDeathStartsANewAdState()
    {
        await this.test('a new death gets a new resurrection ad state and can request the ad again', async () => {
            let gate = this.createGate([]);
            let event = this.createRequestedEvent(gate);
            event.messageData.act = AdsConst.ACTIONS.AD_FAILED;
            gate.closeRequestOrHoldRevive(event);
            this.assert.strictEqual(event.playerSchema.getPrivate(this.stateKey).isClosed, true);
            event.playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.PLAYER_DEATH_EVENT, {targetSchema: event.playerSchema});
            event.messageData.act = AdsConst.ACTIONS.AD_STARTED;
            event.canContinue = true;
            gate.closeRequestOrHoldRevive(event);
            this.assert.strictEqual(event.canContinue, true);
            this.assert.deepStrictEqual(
                [event.playerSchema.getPrivate(this.stateKey).isRequested, event.playerSchema.getPrivate(this.stateKey).isClosed],
                [true, false]
            );
        });
    }

    async testRoomWithoutTheAdMessageRejectsTheStart()
    {
        await this.test('the resurrection ad start in a room that refuses that message is rejected and not held', async () => {
            let gate = this.createGate([]);
            for(let customData of [{allActionsDisabled: true}, {disallowedActions: [AdsConst.ACTIONS.AD_STARTED]}]){
                let event = this.createEvent();
                event.room = this.createRoom(customData);
                gate.closeRequestOrHoldRevive(event);
                this.assert.strictEqual(event.canContinue, false);
                this.assert.strictEqual(event.playerSchema.getPrivate(this.holdKey), null);
                this.assert.strictEqual(event.playerSchema.getPrivate(this.stateKey).isRequested, false);
            }
        });
    }

    async testAliveOrMissingPlayerIsRejected()
    {
        await this.test('the resurrection ad start of an alive, disabled or missing player is rejected', async () => {
            let gate = this.createGate([]);
            for(let inState of [GameConst.STATUS.ACTIVE, GameConst.STATUS.DISABLED]){
                let event = this.createEvent(this.resurrectionAd.id, AdsConst.ACTIONS.AD_STARTED, inState);
                gate.closeRequestOrHoldRevive(event);
                this.assert.strictEqual(event.canContinue, false);
                this.assert.strictEqual(event.playerSchema.getPrivate(this.holdKey), null);
            }
            let missingPlayerEvent = this.createEvent();
            missingPlayerEvent.playerSchema = false;
            gate.closeRequestOrHoldRevive(missingPlayerEvent);
            this.assert.strictEqual(missingPlayerEvent.canContinue, false);
        });
    }

    async testOtherMessagesAndAdsAreIgnored()
    {
        await this.test('the other messages, the other ads and a disabled resurrection ad are not gated', async () => {
            let gate = this.createGate([]);
            let endedEvent = this.createEvent(this.resurrectionAd.id, AdsConst.ACTIONS.AD_ENDED);
            let otherAdEvent = this.createEvent(this.otherAd.id);
            let disabledGate = this.createGate([], this.resurrectionAd.key, Object.assign({}, this.resurrectionAd, {enabled: 0}));
            let disabledEvent = this.createEvent();
            for(let [checkedGate, event] of [[gate, endedEvent], [gate, otherAdEvent], [disabledGate, disabledEvent]]){
                checkedGate.closeRequestOrHoldRevive(event);
                this.assert.strictEqual(event.canContinue, true);
                this.assert.strictEqual(event.playerSchema.getPrivate(this.holdKey), null);
                this.assert.strictEqual(event.playerSchema.getPrivate(this.stateKey), null);
            }
            let emptyEvents = [null, {}];
            for(let emptyEvent of emptyEvents){
                gate.closeRequestOrHoldRevive(emptyEvent);
                gate.holdReviveOrCloseFailedStart(emptyEvent);
                gate.releaseReviveHold(emptyEvent);
            }
            this.assert.deepStrictEqual(emptyEvents, [null, {}]);
        });
    }

    async testStoredStartRefreshesTheHold()
    {
        await this.test('the start stored by the ads system refreshes the revive hold of the requested ad', async () => {
            let notified = [];
            let gate = this.createGate(notified);
            let event = this.createRequestedEvent(gate);
            event.playerSchema.setPrivate(this.holdKey, 1);
            event.startResult = {id: 'stored-played-ad'};
            let startedBefore = Date.now();
            gate.holdReviveOrCloseFailedStart(event);
            this.assert.strictEqual(event.playerSchema.getPrivate(this.holdKey) >= startedBefore + this.maximumDuration, true);
            this.assert.deepStrictEqual(notified, []);
        });
    }

    async testClosedAdReleasesTheHoldAndTellsTheRevive()
    {
        await this.test('a rejected start, a failed ad or an end without reward release the hold and tell the revive, a rewarded end does not tell', async () => {
            let closeCases = [
                {close: (gate, event) => gate.holdReviveOrCloseFailedStart(Object.assign(event, {startResult: false})), isTold: true},
                {
                    close: (gate, event) => gate.closeRequestOrHoldRevive(
                        Object.assign(event, {messageData: {act: AdsConst.ACTIONS.AD_FAILED, ads_id: this.resurrectionAd.id}})
                    ),
                    isTold: true
                },
                {close: (gate, event) => gate.releaseReviveHold(Object.assign(event, {claimResult: false})), isTold: true},
                {close: (gate, event) => gate.releaseReviveHold(Object.assign(event, {claimResult: {id: 'reward'}})), isTold: false}
            ];
            for(let closeCase of closeCases){
                let notified = [];
                let gate = this.createGate(notified);
                let event = this.createRequestedEvent(gate);
                closeCase.close(gate, event);
                let toldNotifications = closeCase.isTold ? [['reldens.deathReviveNotify', event.playerSchema.sessionId]] : [];
                this.assert.deepStrictEqual(
                    [event.playerSchema.getPrivate(this.stateKey).isClosed, event.playerSchema.privateData[this.holdKey], notified],
                    [true, 0, toldNotifications]
                );
                event.messageData = {act: AdsConst.ACTIONS.AD_STARTED, ads_id: this.resurrectionAd.id};
                event.canContinue = true;
                gate.closeRequestOrHoldRevive(event);
                this.assert.strictEqual(event.canContinue, false);
                gate.releaseReviveHold(Object.assign(event, {claimResult: false}));
                this.assert.deepStrictEqual([event.playerSchema.privateData[this.holdKey], notified], [0, toldNotifications]);
            }
        });
    }

    async testNotRequestedOrOtherAdMessagesAreIgnored()
    {
        await this.test('the start result, the end or the failure of an ad not requested or of another ad are ignored', async () => {
            let notified = [];
            let gate = this.createGate(notified);
            let notRequestedEvent = this.createEvent();
            notRequestedEvent.startResult = {id: 'stored-played-ad'};
            let failedEvent = this.createEvent(this.resurrectionAd.id, AdsConst.ACTIONS.AD_FAILED);
            let otherAdEvent = this.createRequestedEvent(gate);
            otherAdEvent.messageData = {act: AdsConst.ACTIONS.AD_ENDED, ads_id: this.otherAd.id};
            gate.holdReviveOrCloseFailedStart(notRequestedEvent);
            gate.releaseReviveHold(notRequestedEvent);
            gate.closeRequestOrHoldRevive(failedEvent);
            gate.releaseReviveHold(otherAdEvent);
            this.assert.deepStrictEqual(
                [
                    notRequestedEvent.playerSchema.getPrivate(this.holdKey),
                    notRequestedEvent.playerSchema.getPrivate(this.stateKey).isClosed,
                    failedEvent.playerSchema.getPrivate(this.stateKey).isClosed,
                    otherAdEvent.playerSchema.getPrivate(this.stateKey).isClosed,
                    notified
                ],
                [null, false, false, false, []]
            );
        });
    }

    async testRewardGivesTheRestorationItemChoice()
    {
        await this.test('the resurrection ad reward of a dead player sets the restoration item choice and tells the revive', async () => {
            let notified = [];
            let gate = this.createGate(notified);
            let event = this.createEvent();
            let rewardEvent = {playerSchema: event.playerSchema, room: event.room, playedAd: this.resurrectionAd};
            gate.chooseRestorationItemUse(rewardEvent);
            this.assert.strictEqual(
                event.playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESTORATION_ITEM_CHOICE),
                ActionsConst.DEATH.RESTORATION_ITEM_CHOICES.USE
            );
            this.assert.deepStrictEqual(notified, [['reldens.deathReviveNotify', event.playerSchema.sessionId]]);
            let aliveEvent = this.createEvent(this.resurrectionAd.id, AdsConst.ACTIONS.AD_STARTED, GameConst.STATUS.ACTIVE);
            let notRewarded = [
                [gate, Object.assign({}, rewardEvent, {playedAd: this.otherAd})],
                [gate, Object.assign({}, rewardEvent, {playerSchema: aliveEvent.playerSchema})],
                [gate, Object.assign({}, rewardEvent, {playerSchema: false})],
                [this.createGate(notified, ''), rewardEvent],
                [gate, null]
            ];
            for(let [checkedGate, notRewardedEvent] of notRewarded){
                checkedGate.chooseRestorationItemUse(notRewardedEvent);
            }
            this.assert.deepStrictEqual(
                [notified.length, aliveEvent.playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESTORATION_ITEM_CHOICE)],
                [1, null]
            );
        });
    }

    async testTownReviveDataOffersTheOpenAd()
    {
        await this.test('the town revive offers the ad event key only without item, with the ad open and allowed in the room', async () => {
            let gate = this.createGate([]);
            let offeredEvent = this.createEvent();
            let reviveData = {};
            let townEvent = {
                playerSchema: offeredEvent.playerSchema,
                client: {},
                room: offeredEvent.room,
                hasRestorationItem: false,
                reviveData
            };
            gate.appendResurrectionAdOffer(townEvent);
            this.assert.deepStrictEqual(reviveData, {resurrectionAdEventKey: this.resurrectionAd.eventKey});
            let closedEvent = this.createRequestedEvent(gate);
            gate.releaseReviveHold(Object.assign(closedEvent, {claimResult: false}));
            let notOfferedCases = [
                Object.assign({}, townEvent, {hasRestorationItem: true, reviveData: {}}),
                Object.assign({}, townEvent, {playerSchema: closedEvent.playerSchema, reviveData: {}}),
                Object.assign({}, townEvent, {room: this.createRoom({allActionsDisabled: true}), reviveData: {}}),
                Object.assign({}, townEvent, {
                    room: this.createRoom({disallowedActions: [AdsConst.ACTIONS.AD_ENDED]}),
                    reviveData: {}
                })
            ];
            for(let notOfferedEvent of notOfferedCases){
                gate.appendResurrectionAdOffer(notOfferedEvent);
                this.assert.deepStrictEqual(notOfferedEvent.reviveData, {});
            }
        });
    }

}

module.exports.TestResurrectionAdGate = TestResurrectionAdGate;
