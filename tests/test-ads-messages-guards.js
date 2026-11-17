/**
 *
 * Reldens - Test Ads Messages Guards
 *
 */

const { BaseTest } = require('./base-test');
const { AdsRewardClaimsBuilder } = require('./fixtures/ads-reward-claims-builder');
const { AdsConst } = require('../lib/ads/constants');
const { GameConst } = require('../lib/game/constants');

class TestAdsMessagesGuards extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.adsBuilder = new AdsRewardClaimsBuilder();
    }

    async expectEndedWithoutReward(adsSetup)
    {
        let claimResult = await adsSetup.adsMessageActions.adEnded(
            adsSetup.endedMessage,
            adsSetup.room,
            adsSetup.playerSchema
        );
        this.assert.strictEqual(claimResult, false);
        this.assert.deepStrictEqual(adsSetup.givenRewards, []);
        this.assert.deepStrictEqual(adsSetup.emittedEvents, ['reldens.afterAdEnded']);
    }

    async testAdEndedWithoutStartedRecordIsNotRewarded()
    {
        await this.test('an ad ended with no started record gives no reward and stores nothing', async () => {
            let adsSetup = this.adsBuilder.createAdsSetup(true);
            await this.expectEndedWithoutReward(adsSetup);
            this.assert.deepStrictEqual(adsSetup.storedRecords, {});
        });
    }

    async testUnknownAdIdChangesNothing()
    {
        await this.test('an unknown ad ID on the start, end and failure stores nothing, disables nobody and rewards nothing', async () => {
            let adsSetup = this.adsBuilder.createAdsSetup(true);
            let unknownAdId = adsSetup.adId + 999;
            let room = adsSetup.room;
            let playerSchema = adsSetup.playerSchema;
            let actions = adsSetup.adsMessageActions;
            await actions.adStart({act: AdsConst.ACTIONS.AD_STARTED, ads_id: unknownAdId}, room, playerSchema);
            await actions.adEnded({act: AdsConst.ACTIONS.AD_ENDED, ads_id: unknownAdId}, room, playerSchema);
            let failResult = await actions.adFailed({act: AdsConst.ACTIONS.AD_FAILED, ads_id: unknownAdId}, room, playerSchema);
            this.assert.strictEqual(failResult, false);
            this.assert.deepStrictEqual(adsSetup.storedRecords, {});
            this.assert.deepStrictEqual(adsSetup.deactivatedStates, []);
            this.assert.deepStrictEqual(adsSetup.givenRewards, []);
            this.assert.strictEqual(playerSchema.state.inState, GameConst.STATUS.ACTIVE);
        });
    }

    async testFailureOfAnAdNeverStartedOrAlreadyEndedChangesNothing()
    {
        await this.test('a failure of an ad never started or already ended keeps the stored play and the reward', async () => {
            let adsSetup = this.adsBuilder.createAdsSetup(true);
            let actions = adsSetup.adsMessageActions;
            this.assert.strictEqual(
                await actions.adFailed(adsSetup.failedMessage, adsSetup.room, adsSetup.playerSchema),
                false
            );
            this.assert.deepStrictEqual(adsSetup.storedRecords, {});
            let storedAd = this.adsBuilder.storeStartedAd(adsSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
            await actions.adEnded(adsSetup.endedMessage, adsSetup.room, adsSetup.playerSchema);
            let claimedEndedAt = storedAd.ended_at;
            this.assert.strictEqual(
                await actions.adFailed(adsSetup.failedMessage, adsSetup.room, adsSetup.playerSchema),
                false
            );
            this.assert.strictEqual(storedAd.ended_at, claimedEndedAt);
            this.assert.deepStrictEqual(adsSetup.givenRewards, ['coins']);
        });
    }

    async testAdEndedAtTheMinimumDurationIsRewarded()
    {
        await this.test('an ad ended at its minimum duration is closed and rewarded', async () => {
            let adsSetup = this.adsBuilder.createAdsSetup(true);
            let storedAd = this.adsBuilder.storeStartedAd(adsSetup, AdsConst.VIDEOS_MINIMUM_DURATION);
            await adsSetup.adsMessageActions.adEnded(adsSetup.endedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.notStrictEqual(storedAd.ended_at, null);
            this.assert.deepStrictEqual(adsSetup.givenRewards, ['coins']);
        });
    }

    async testSecondStartOfTheRunningAdRestartsItsStartedDate()
    {
        await this.test('a second start of the running ad stores a new started date', async () => {
            let adsSetup = this.adsBuilder.createAdsSetup(true);
            let storedAd = this.adsBuilder.storeStartedAd(adsSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
            let firstStartedAt = storedAd.started_at;
            await adsSetup.adsMessageActions.adStart(adsSetup.startedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.ok(new Date(storedAd.started_at).getTime() > new Date(firstStartedAt).getTime());
            this.assert.strictEqual(storedAd.ended_at, null);
            this.assert.deepStrictEqual(adsSetup.deactivatedStates, [GameConst.STATUS.DISABLED]);
        });
    }

    async testAdWithoutRewardItemIsClosedWithNoReward()
    {
        await this.test('an ad without reward item is closed with no reward and no reward event', async () => {
            let adsSetup = this.adsBuilder.createAdsSetup(true, GameConst.STATUS.ACTIVE, {
                related_ads_event_video: {event_key: 'reldens.testEvent', event_data: '{"rewardItemQty":1}'}
            });
            let storedAd = this.adsBuilder.storeStartedAd(adsSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
            await this.expectEndedWithoutReward(adsSetup);
            this.assert.notStrictEqual(storedAd.ended_at, null);
        });
    }

}

module.exports.TestAdsMessagesGuards = TestAdsMessagesGuards;
