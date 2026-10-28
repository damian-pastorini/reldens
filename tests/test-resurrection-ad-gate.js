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
        });
    }

    async testAlivePlayerOrMissingPlayerIsRejected()
    {
        await this.test('the resurrection ad start of an alive or missing player is rejected', async () => {
            let gate = this.createGate();
            let aliveEvent = this.createEvent(this.resurrectionAdId, GameConst.STATUS.ACTIVE);
            this.assert.strictEqual(gate.onBeforeSceneExecuteMessages(aliveEvent), false);
            this.assert.strictEqual(aliveEvent.canContinue, false);
            let missingPlayerEvent = this.createEvent(this.resurrectionAdId);
            missingPlayerEvent.playerSchema = false;
            this.assert.strictEqual(gate.onBeforeSceneExecuteMessages(missingPlayerEvent), false);
            this.assert.strictEqual(missingPlayerEvent.canContinue, false);
        });
    }

    async testFirstStartOfADeadPlayerIsAcceptedOnce()
    {
        await this.test('a dead player starts the resurrection ad once per death', async () => {
            let gate = this.createGate();
            let firstEvent = this.createEvent(this.resurrectionAdId);
            let startedBefore = Date.now();
            this.assert.strictEqual(gate.onBeforeSceneExecuteMessages(firstEvent), true);
            this.assert.strictEqual(firstEvent.canContinue, true);
            let adStarted = firstEvent.playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_STARTED);
            this.assert.strictEqual(adStarted >= startedBefore, true);
            let secondEvent = this.createEvent(this.resurrectionAdId);
            secondEvent.playerSchema = firstEvent.playerSchema;
            this.assert.strictEqual(gate.onBeforeSceneExecuteMessages(secondEvent), false);
            this.assert.strictEqual(secondEvent.canContinue, false);
        });
    }

    async testFailedStartedAdStopsTheDeathResolutionWait()
    {
        await this.test('a failed started resurrection ad is marked so the death resolution stops waiting', async () => {
            let gate = this.createGate();
            let startEvent = this.createEvent(this.resurrectionAdId);
            gate.onBeforeSceneExecuteMessages(startEvent);
            let relocator = new PlayerDeathRelocator({config: GameplayPlayerBuilder.createConfig({})});
            this.assert.strictEqual(relocator.isWaitingResurrectionAd(startEvent.playerSchema), true);
            let failedEvent = this.createEvent(this.resurrectionAdId, GameConst.STATUS.DEATH, AdsConst.ACTIONS.AD_FAILED);
            failedEvent.playerSchema = startEvent.playerSchema;
            this.assert.strictEqual(gate.onBeforeSceneExecuteMessages(failedEvent), true);
            this.assert.strictEqual(failedEvent.canContinue, true);
            let adFailed = startEvent.playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_FAILED);
            this.assert.strictEqual(adFailed, true);
            this.assert.strictEqual(relocator.isWaitingResurrectionAd(startEvent.playerSchema), false);
            let secondStartEvent = this.createEvent(this.resurrectionAdId);
            secondStartEvent.playerSchema = startEvent.playerSchema;
            this.assert.strictEqual(gate.onBeforeSceneExecuteMessages(secondStartEvent), false);
            this.assert.strictEqual(secondStartEvent.canContinue, false);
        });
    }

    async testFailureWithoutStartOrOfOtherAdIsNotMarked()
    {
        await this.test('a failure of an ad not started, of another ad or without player is not marked', async () => {
            let gate = this.createGate();
            let adFailedKey = ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_FAILED;
            let deathState = GameConst.STATUS.DEATH;
            let failedAction = AdsConst.ACTIONS.AD_FAILED;
            let notStartedEvent = this.createEvent(this.resurrectionAdId, deathState, failedAction);
            this.assert.strictEqual(gate.onBeforeSceneExecuteMessages(notStartedEvent), false);
            this.assert.strictEqual(notStartedEvent.playerSchema.getPrivate(adFailedKey), null);
            let startEvent = this.createEvent(this.resurrectionAdId);
            gate.onBeforeSceneExecuteMessages(startEvent);
            let otherAdEvent = this.createEvent(this.otherAdId, deathState, failedAction);
            otherAdEvent.playerSchema = startEvent.playerSchema;
            this.assert.strictEqual(gate.onBeforeSceneExecuteMessages(otherAdEvent), false);
            this.assert.strictEqual(startEvent.playerSchema.getPrivate(adFailedKey), null);
            let missingPlayerEvent = this.createEvent(this.resurrectionAdId, deathState, failedAction);
            missingPlayerEvent.playerSchema = false;
            this.assert.strictEqual(gate.onBeforeSceneExecuteMessages(missingPlayerEvent), false);
            this.assert.strictEqual(missingPlayerEvent.canContinue, true);
        });
    }

    async testNewDeathClearsThePreviousAdFailure()
    {
        await this.test('a new death clears the failure of the previous death resurrection ad', async () => {
            let gate = this.createGate();
            let startEvent = this.createEvent(this.resurrectionAdId);
            gate.onBeforeSceneExecuteMessages(startEvent);
            let failedEvent = this.createEvent(this.resurrectionAdId, GameConst.STATUS.DEATH, AdsConst.ACTIONS.AD_FAILED);
            failedEvent.playerSchema = startEvent.playerSchema;
            gate.onBeforeSceneExecuteMessages(failedEvent);
            let relocator = new PlayerDeathRelocator({config: GameplayPlayerBuilder.createConfig({})});
            this.assert.strictEqual(relocator.onPlayerDeath({targetSchema: startEvent.playerSchema}), false);
            let privateData = startEvent.playerSchema.privateData;
            this.assert.strictEqual(privateData[ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_STARTED], false);
            this.assert.strictEqual(privateData[ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_FAILED], false);
        });
    }

    async testDisabledResurrectionAdIsNotGated()
    {
        await this.test('a disabled resurrection ad is not gated, the ads actions reject it', async () => {
            let event = this.createEvent(this.resurrectionAdId);
            this.assert.strictEqual(this.createGate(0).onBeforeSceneExecuteMessages(event), false);
            this.assert.strictEqual(event.canContinue, true);
            let adStartedKey = ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_STARTED;
            this.assert.strictEqual(Object.keys(event.playerSchema.privateData).includes(adStartedKey), false);
        });
    }

}

module.exports.TestResurrectionAdGate = TestResurrectionAdGate;
