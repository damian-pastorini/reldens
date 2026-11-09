/**
 *
 * Reldens - Test Resurrection Ad Gate
 *
 */

const { BaseTest } = require('./base-test');
const { GameplayPlayerBuilder } = require('./fixtures/gameplay-player-builder');
const { ResurrectionAdGate } = require('../lib/actions/server/resurrection-ad-gate');
const { PlayerDeathRelocator } = require('../lib/actions/server/player-death-relocator');
const { ActionsConst } = require('../lib/actions/constants');
const { AdsConst } = require('../lib/ads/constants');
const { GameConst } = require('../lib/game/constants');

class TestResurrectionAdGate extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.resurrectionAdId = 7;
        this.otherAdId = 8;
        this.privateDataKeys = ActionsConst.DEATH.PRIVATE_DATA;
        this.relocator = new PlayerDeathRelocator({config: GameplayPlayerBuilder.createConfigManager({}), events: {}});
    }

    createGate(resurrectionAdEnabled = 1)
    {
        return new ResurrectionAdGate({
            config: GameplayPlayerBuilder.createConfig({
                [ActionsConst.DEATH.CONFIG_PATHS.RESURRECTION_ADS_KEY]: 'resurrection-video',
                [AdsConst.CONFIG_PATHS.COLLECTION]: {
                    [this.resurrectionAdId]: {
                        id: this.resurrectionAdId,
                        key: 'resurrection-video',
                        enabled: resurrectionAdEnabled,
                        provider: {enabled: 1}
                    },
                    [this.otherAdId]: {id: this.otherAdId, key: 'other-video', enabled: 1, provider: {enabled: 1}}
                }
            })
        });
    }

    createEvent(adsId, inState = GameConst.STATUS.DEATH, act = AdsConst.ACTIONS.AD_STARTED)
    {
        return {
            messageData: {act, ads_id: adsId},
            playerSchema: GameplayPlayerBuilder.createPlayerSchema({inState}),
            canContinue: true
        };
    }

    createStartedEvent(gate)
    {
        let startEvent = this.createEvent(this.resurrectionAdId);
        gate.onBeforeSceneExecuteMessages(startEvent);
        startEvent.startResult = {id: 'stored-played-ad'};
        gate.onAfterAdStarted(startEvent);
        return startEvent;
    }

    async testOtherMessagesAreIgnored()
    {
        await this.test('the messages that are not an ad start and the other ads starts are not gated', async () => {
            let gate = this.createGate();
            let adEndedEvent = this.createEvent(this.resurrectionAdId);
            adEndedEvent.messageData.act = AdsConst.ACTIONS.AD_ENDED;
            this.assert.strictEqual(gate.onBeforeSceneExecuteMessages(adEndedEvent), false);
            this.assert.strictEqual(adEndedEvent.canContinue, true);
            let otherAdEvent = this.createEvent(this.otherAdId);
            this.assert.strictEqual(gate.onBeforeSceneExecuteMessages(otherAdEvent), false);
            this.assert.strictEqual(otherAdEvent.canContinue, true);
            this.assert.strictEqual(gate.onBeforeSceneExecuteMessages(null), false);
        });
    }

    async testAlivePlayerOrMissingPlayerIsRejected()
    {
        await this.test('the resurrection ad start of an alive, disabled or missing player is rejected', async () => {
            let gate = this.createGate();
            for(let inState of [GameConst.STATUS.ACTIVE, GameConst.STATUS.DISABLED]){
                let notDeadEvent = this.createEvent(this.resurrectionAdId, inState);
                this.assert.strictEqual(gate.onBeforeSceneExecuteMessages(notDeadEvent), false);
                this.assert.strictEqual(notDeadEvent.canContinue, false);
                this.assert.deepStrictEqual(notDeadEvent.playerSchema.privateData, {});
            }
            let missingPlayerEvent = this.createEvent(this.resurrectionAdId);
            missingPlayerEvent.playerSchema = false;
            this.assert.strictEqual(gate.onBeforeSceneExecuteMessages(missingPlayerEvent), false);
            this.assert.strictEqual(missingPlayerEvent.canContinue, false);
        });
    }

    async testDeadPlayerRequestsTheAdOncePerDeath()
    {
        await this.test('a dead player requests the resurrection ad once per death, waited while it is stored', async () => {
            let gate = this.createGate();
            let firstEvent = this.createEvent(this.resurrectionAdId);
            let requestedBefore = Date.now();
            this.assert.strictEqual(gate.onBeforeSceneExecuteMessages(firstEvent), true);
            this.assert.strictEqual(firstEvent.canContinue, true);
            let adRequested = firstEvent.playerSchema.getPrivate(this.privateDataKeys.RESURRECTION_AD_REQUESTED);
            this.assert.strictEqual(adRequested >= requestedBefore, true);
            this.assert.strictEqual(firstEvent.playerSchema.getPrivate(this.privateDataKeys.RESURRECTION_AD_STARTED), null);
            this.assert.strictEqual(this.relocator.isWaitingResurrectionAd(firstEvent.playerSchema), true);
            let secondEvent = this.createEvent(this.resurrectionAdId);
            secondEvent.playerSchema = firstEvent.playerSchema;
            this.assert.strictEqual(gate.onBeforeSceneExecuteMessages(secondEvent), false);
            this.assert.strictEqual(secondEvent.canContinue, false);
        });
    }

    async testStoredStartMarksTheAdStarted()
    {
        await this.test('only the start stored by the ads system for the requested ad starts the wait', async () => {
            let gate = this.createGate();
            let startedBefore = Date.now();
            let startEvent = this.createStartedEvent(gate);
            let adStarted = startEvent.playerSchema.getPrivate(this.privateDataKeys.RESURRECTION_AD_STARTED);
            this.assert.strictEqual(adStarted >= startedBefore, true);
            this.assert.strictEqual(this.relocator.isWaitingResurrectionAd(startEvent.playerSchema), true);
            let notRequestedEvent = this.createEvent(this.resurrectionAdId);
            notRequestedEvent.startResult = {id: 'stored-played-ad'};
            let otherAdEvent = this.createEvent(this.otherAdId);
            gate.onBeforeSceneExecuteMessages(otherAdEvent);
            otherAdEvent.startResult = {id: 'stored-played-ad'};
            for(let notStartedEvent of [notRequestedEvent, otherAdEvent]){
                this.assert.strictEqual(gate.onAfterAdStarted(notStartedEvent), false);
                this.assert.strictEqual(notStartedEvent.playerSchema.getPrivate(this.privateDataKeys.RESURRECTION_AD_STARTED), null);
            }
        });
    }

    async testRejectedStartStopsTheWait()
    {
        await this.test('a start rejected or failed in the ads system marks the requested ad failed', async () => {
            let gate = this.createGate();
            let rejectedEvent = this.createEvent(this.resurrectionAdId);
            gate.onBeforeSceneExecuteMessages(rejectedEvent);
            this.assert.strictEqual(this.relocator.isWaitingResurrectionAd(rejectedEvent.playerSchema), true);
            rejectedEvent.startResult = false;
            this.assert.strictEqual(gate.onAfterAdStarted(rejectedEvent), true);
            this.assert.strictEqual(rejectedEvent.playerSchema.getPrivate(this.privateDataKeys.RESURRECTION_AD_FAILED), true);
            this.assert.strictEqual(rejectedEvent.playerSchema.getPrivate(this.privateDataKeys.RESURRECTION_AD_STARTED), null);
            this.assert.strictEqual(this.relocator.isWaitingResurrectionAd(rejectedEvent.playerSchema), false);
        });
    }

    async testEndedOrFailedAdStopsTheWait()
    {
        await this.test('the processed end or the failure of the started ad stops the death resolution wait', async () => {
            let gate = this.createGate();
            let endedEvent = this.createStartedEvent(gate);
            endedEvent.messageData.act = AdsConst.ACTIONS.AD_ENDED;
            this.assert.strictEqual(gate.onAfterAdEnded(endedEvent), true);
            this.assert.strictEqual(endedEvent.playerSchema.getPrivate(this.privateDataKeys.RESURRECTION_AD_ENDED), true);
            this.assert.strictEqual(this.relocator.isWaitingResurrectionAd(endedEvent.playerSchema), false);
            let failedStart = this.createStartedEvent(gate);
            let failedEvent = this.createEvent(this.resurrectionAdId, GameConst.STATUS.DEATH, AdsConst.ACTIONS.AD_FAILED);
            failedEvent.playerSchema = failedStart.playerSchema;
            this.assert.strictEqual(gate.onBeforeSceneExecuteMessages(failedEvent), true);
            this.assert.strictEqual(failedEvent.canContinue, true);
            this.assert.strictEqual(failedStart.playerSchema.getPrivate(this.privateDataKeys.RESURRECTION_AD_FAILED), true);
            this.assert.strictEqual(this.relocator.isWaitingResurrectionAd(failedStart.playerSchema), false);
            let secondStartEvent = this.createEvent(this.resurrectionAdId);
            secondStartEvent.playerSchema = failedStart.playerSchema;
            this.assert.strictEqual(gate.onBeforeSceneExecuteMessages(secondStartEvent), false);
            this.assert.strictEqual(secondStartEvent.canContinue, false);
        });
    }

    async testEndOrFailureWithoutRequestOrOfOtherAdIsNotMarked()
    {
        await this.test('an end or a failure of an ad not requested, of another ad or without player is ignored', async () => {
            let gate = this.createGate();
            let deathState = GameConst.STATUS.DEATH;
            let failedAction = AdsConst.ACTIONS.AD_FAILED;
            let notRequestedEvent = this.createEvent(this.resurrectionAdId, deathState, failedAction);
            this.assert.strictEqual(gate.onBeforeSceneExecuteMessages(notRequestedEvent), false);
            this.assert.strictEqual(gate.onAfterAdEnded(notRequestedEvent), false);
            this.assert.deepStrictEqual(notRequestedEvent.playerSchema.privateData, {});
            let startEvent = this.createStartedEvent(gate);
            let otherAdEvent = this.createEvent(this.otherAdId, deathState, failedAction);
            otherAdEvent.playerSchema = startEvent.playerSchema;
            this.assert.strictEqual(gate.onBeforeSceneExecuteMessages(otherAdEvent), false);
            this.assert.strictEqual(gate.onAfterAdEnded(otherAdEvent), false);
            this.assert.strictEqual(startEvent.playerSchema.getPrivate(this.privateDataKeys.RESURRECTION_AD_FAILED), null);
            this.assert.strictEqual(startEvent.playerSchema.getPrivate(this.privateDataKeys.RESURRECTION_AD_ENDED), null);
            let missingPlayerEvent = this.createEvent(this.resurrectionAdId, deathState, failedAction);
            missingPlayerEvent.playerSchema = false;
            this.assert.strictEqual(gate.onBeforeSceneExecuteMessages(missingPlayerEvent), false);
            this.assert.strictEqual(gate.onAfterAdEnded(missingPlayerEvent), false);
            this.assert.strictEqual(missingPlayerEvent.canContinue, true);
        });
    }

    async testNewDeathClearsThePreviousAdFlags()
    {
        await this.test('a new death clears the resurrection ad flags of the previous death', async () => {
            let gate = this.createGate();
            let startEvent = this.createStartedEvent(gate);
            startEvent.messageData.act = AdsConst.ACTIONS.AD_ENDED;
            gate.onAfterAdEnded(startEvent);
            this.assert.strictEqual(this.relocator.onPlayerDeath({targetSchema: startEvent.playerSchema}), false);
            let privateData = startEvent.playerSchema.privateData;
            this.assert.strictEqual(privateData[this.privateDataKeys.RESURRECTION_AD_REQUESTED], false);
            this.assert.strictEqual(privateData[this.privateDataKeys.RESURRECTION_AD_STARTED], false);
            this.assert.strictEqual(privateData[this.privateDataKeys.RESURRECTION_AD_ENDED], false);
            this.assert.strictEqual(privateData[this.privateDataKeys.RESURRECTION_AD_FAILED], false);
        });
    }

    async testDisabledResurrectionAdIsNotGated()
    {
        await this.test('a disabled resurrection ad is not gated, the ads actions reject it', async () => {
            let event = this.createEvent(this.resurrectionAdId);
            this.assert.strictEqual(this.createGate(0).onBeforeSceneExecuteMessages(event), false);
            this.assert.strictEqual(event.canContinue, true);
            this.assert.deepStrictEqual(event.playerSchema.privateData, {});
        });
    }

}

module.exports.TestResurrectionAdGate = TestResurrectionAdGate;
