/**
 *
 * Reldens - Test Ads Reward Claims
 *
 */

const { BaseTest } = require('./base-test');
const { AdsRewardClaimsBuilder } = require('./fixtures/ads-reward-claims-builder');
const { AdsConst } = require('../lib/ads/constants');
const { GameConst } = require('../lib/game/constants');
const timersPromises = require('timers/promises');

class TestAdsRewardClaims extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.adsBuilder = new AdsRewardClaimsBuilder();
    }

    async testRewardIsGivenOnceForTheSamePlayedAd()
    {
        await this.test('the reward is given once and a repeated ad ended message is rejected', async () => {
            let adsSetup = this.adsBuilder.createAdsSetup(false);
            this.adsBuilder.storeStartedAd(adsSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
            await adsSetup.adsMessageActions.adEnded(adsSetup.endedMessage, adsSetup.room, adsSetup.playerSchema);
            await adsSetup.adsMessageActions.adEnded(adsSetup.endedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.deepStrictEqual(adsSetup.givenRewards, ['coins']);
        });
    }

    async testConcurrentAdEndedMessagesGiveASingleReward()
    {
        await this.test('concurrent ad ended messages give a single reward', async () => {
            let adsSetup = this.adsBuilder.createAdsSetup(false);
            this.adsBuilder.storeStartedAd(adsSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
            await Promise.all([
                adsSetup.adsMessageActions.adEnded(adsSetup.endedMessage, adsSetup.room, adsSetup.playerSchema),
                adsSetup.adsMessageActions.adEnded(adsSetup.endedMessage, adsSetup.room, adsSetup.playerSchema)
            ]);
            this.assert.strictEqual(adsSetup.givenRewards.length, 1);
        });
    }

    async testNonReplayAdCanNotBeClaimedAfterStartingItAgain()
    {
        await this.test('starting a claimed non replay ad again keeps the ended date and gives no reward', async () => {
            let adsSetup = this.adsBuilder.createAdsSetup(false);
            let storedAd = this.adsBuilder.storeStartedAd(adsSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
            await adsSetup.adsMessageActions.adEnded(adsSetup.endedMessage, adsSetup.room, adsSetup.playerSchema);
            let claimedEndedAt = storedAd.ended_at;
            await adsSetup.adsMessageActions.adStart(adsSetup.startedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.strictEqual(storedAd.ended_at, claimedEndedAt);
            this.assert.deepStrictEqual(adsSetup.deactivatedStates, []);
            await adsSetup.adsMessageActions.adEnded(adsSetup.endedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.strictEqual(adsSetup.givenRewards.length, 1);
        });
    }

    async testReplayAdStartAfterTheCooldownResetsTheEndedDate()
    {
        await this.test('starting a replay ad after its replay cooldown resets the ended date', async () => {
            let adsSetup = this.adsBuilder.createAdsSetup(true);
            let storedAd = this.adsBuilder.storeStartedAd(
                adsSetup,
                AdsConst.REPLAY_COOLDOWN * 2,
                AdsConst.REPLAY_COOLDOWN + AdsConst.VIDEOS_MINIMUM_DURATION
            );
            await adsSetup.adsMessageActions.adStart(adsSetup.startedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.strictEqual(storedAd.ended_at, null);
        });
    }

    async testReplayAdCanNotBeReplayedDuringTheCooldown()
    {
        await this.test('a replay ad rewarded before its replay cooldown can not be played and rewarded again', async () => {
            let adsSetup = this.adsBuilder.createAdsSetup(true);
            this.adsBuilder.storeStartedAd(adsSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
            await adsSetup.adsMessageActions.adEnded(adsSetup.endedMessage, adsSetup.room, adsSetup.playerSchema);
            let storedAd = adsSetup.storedRecords[adsSetup.playerSchema.player_id+'_'+adsSetup.adId];
            let claimedEndedAt = storedAd.ended_at;
            await adsSetup.adsMessageActions.adStart(adsSetup.startedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.strictEqual(storedAd.ended_at, claimedEndedAt);
            await adsSetup.adsMessageActions.adEnded(adsSetup.endedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.deepStrictEqual(adsSetup.givenRewards, ['coins']);
        });
    }

    async testReplayAdWithoutCooldownCanBeReplayedRightAway()
    {
        await this.test('a replay ad with a zero replay cooldown can be played again right after its reward', async () => {
            let adsSetup = this.adsBuilder.createAdsSetup(true, GameConst.STATUS.ACTIVE, {
                related_ads_event_video: {
                    event_key: 'reldens.testEvent',
                    event_data: '{"rewardItemKey":"coins","rewardItemQty":1,"replayCooldown":0}'
                }
            });
            let storedAd = this.adsBuilder.storeStartedAd(adsSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
            await adsSetup.adsMessageActions.adEnded(adsSetup.endedMessage, adsSetup.room, adsSetup.playerSchema);
            await adsSetup.adsMessageActions.adStart(adsSetup.startedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.strictEqual(storedAd.ended_at, null);
        });
    }

    async testDisabledAdCanNotBeStartedNorRewarded()
    {
        await this.test('a disabled ad can not be started nor rewarded', async () => {
            let adsSetup = this.adsBuilder.createAdsSetup(true, GameConst.STATUS.ACTIVE, {enabled: 0});
            await adsSetup.adsMessageActions.adStart(adsSetup.startedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.deepStrictEqual(adsSetup.storedRecords, {});
            this.assert.deepStrictEqual(adsSetup.deactivatedStates, []);
            this.adsBuilder.storeStartedAd(adsSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
            await adsSetup.adsMessageActions.adEnded(adsSetup.endedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.deepStrictEqual(adsSetup.givenRewards, []);
        });
    }

    async testAdOfADisabledProviderCanNotBeStartedNorRewarded()
    {
        await this.test('an ad of a disabled provider can not be started nor rewarded', async () => {
            let adsSetup = this.adsBuilder.createAdsSetup(true, GameConst.STATUS.ACTIVE, {
                related_ads_providers: {id: 1, key: 'crazyGames', enabled: 0}
            });
            await adsSetup.adsMessageActions.adStart(adsSetup.startedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.deepStrictEqual(adsSetup.storedRecords, {});
            this.adsBuilder.storeStartedAd(adsSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
            await adsSetup.adsMessageActions.adEnded(adsSetup.endedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.deepStrictEqual(adsSetup.givenRewards, []);
        });
    }

    async testAdEndedBeforeTheMinimumDurationIsNotRewarded()
    {
        await this.test('an ad ended before its minimum duration is not rewarded and stays open', async () => {
            let adsSetup = this.adsBuilder.createAdsSetup(false);
            let storedAd = this.adsBuilder.storeStartedAd(adsSetup, 0);
            await adsSetup.adsMessageActions.adEnded(adsSetup.endedMessage, adsSetup.room, adsSetup.playerSchema);
            await timersPromises.setTimeout(AdsConst.VIDEOS_MINIMUM_DURATION / 100);
            this.assert.deepStrictEqual(adsSetup.givenRewards, []);
            this.assert.strictEqual(storedAd.ended_at, null);
            this.adsBuilder.storeStartedAd(adsSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
            await adsSetup.adsMessageActions.adEnded(adsSetup.endedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.deepStrictEqual(adsSetup.givenRewards, ['coins']);
        });
    }

    async testFailedAdIsClosedWithoutReward()
    {
        await this.test('a failed ad activates the player and is closed without reward', async () => {
            let adsSetup = this.adsBuilder.createAdsSetup(false, GameConst.STATUS.DISABLED);
            let storedAd = this.adsBuilder.storeStartedAd(adsSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
            await adsSetup.adsMessageActions.adFailed(adsSetup.failedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.deepStrictEqual(adsSetup.activatedStates, [GameConst.STATUS.ACTIVE]);
            this.assert.notStrictEqual(storedAd.ended_at, null);
            await adsSetup.adsMessageActions.adEnded(adsSetup.endedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.deepStrictEqual(adsSetup.givenRewards, []);
        });
    }

    async testRewardCanceledByASubscriberIsNotGivenAndThePlayedAdStaysClosed()
    {
        await this.test('a reward canceled by a subscriber is not given and the played ad stays closed', async () => {
            let adsSetup = this.adsBuilder.createAdsSetup(false);
            adsSetup.continueReward = false;
            let storedAd = this.adsBuilder.storeStartedAd(adsSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
            await adsSetup.adsMessageActions.adEnded(adsSetup.endedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.deepStrictEqual(
                adsSetup.emittedEvents,
                ['reldens.beforeGiveAdRewardItem', 'reldens.afterAdEnded']
            );
            let adEndedData = [...adsSetup.emittedEventsData].pop();
            this.assert.strictEqual(adEndedData.messageData, adsSetup.endedMessage);
            this.assert.strictEqual(adEndedData.claimResult, false);
            this.assert.deepStrictEqual(adsSetup.givenRewards, []);
            this.assert.notStrictEqual(storedAd.ended_at, null);
        });
    }

    async testGivenRewardIsAnnouncedOnlyAfterItIsGiven()
    {
        await this.test('the given reward is announced after it is given and a failed reward is not', async () => {
            let adsSetup = this.adsBuilder.createAdsSetup(false);
            this.adsBuilder.storeStartedAd(adsSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
            await adsSetup.adsMessageActions.adEnded(adsSetup.endedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.deepStrictEqual(
                adsSetup.emittedEvents,
                ['reldens.beforeGiveAdRewardItem', 'reldens.afterGiveAdRewardItem', 'reldens.afterAdEnded']
            );
            let adEndedData = adsSetup.emittedEventsData.pop();
            this.assert.strictEqual(adEndedData.messageData, adsSetup.endedMessage);
            this.assert.strictEqual(adEndedData.playerSchema, adsSetup.playerSchema);
            this.assert.strictEqual(adEndedData.claimResult, 1);
            let afterRewardData = adsSetup.emittedEventsData.pop();
            this.assert.strictEqual(afterRewardData.playedAd.id, adsSetup.adId);
            this.assert.strictEqual(afterRewardData.room, adsSetup.room);
            this.assert.strictEqual(afterRewardData.playerSchema, adsSetup.playerSchema);
            this.assert.strictEqual(afterRewardData.rewardResult, 1);
            let failedSetup = this.adsBuilder.createAdsSetup(false);
            failedSetup.adsMessageActions.giveRewardAction = {execute: async () => false};
            this.adsBuilder.storeStartedAd(failedSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
            await failedSetup.adsMessageActions.adEnded(
                failedSetup.endedMessage,
                failedSetup.room,
                failedSetup.playerSchema
            );
            this.assert.deepStrictEqual(
                failedSetup.emittedEvents,
                ['reldens.beforeGiveAdRewardItem', 'reldens.afterAdEnded']
            );
            this.assert.strictEqual([...failedSetup.emittedEventsData].pop().claimResult, false);
        });
    }

    async testStoredAdStartIsAnnouncedAndARejectedStartIsNot()
    {
        await this.test('every processed ad start is announced with its stored or rejected result', async () => {
            let adsSetup = this.adsBuilder.createAdsSetup(false);
            await adsSetup.adsMessageActions.adStart(adsSetup.startedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.deepStrictEqual(adsSetup.emittedEvents, ['reldens.afterAdStarted']);
            let adStartedData = [...adsSetup.emittedEventsData].pop();
            this.assert.strictEqual(adStartedData.messageData, adsSetup.startedMessage);
            this.assert.strictEqual(adStartedData.startResult.ads_id, adsSetup.adId);
            this.assert.strictEqual(adStartedData.playerSchema, adsSetup.playerSchema);
            let claimedSetup = this.adsBuilder.createAdsSetup(false);
            this.adsBuilder.storeStartedAd(claimedSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
            await claimedSetup.adsMessageActions.adEnded(
                claimedSetup.endedMessage,
                claimedSetup.room,
                claimedSetup.playerSchema
            );
            claimedSetup.emittedEvents.length = 0;
            await claimedSetup.adsMessageActions.adStart(
                claimedSetup.startedMessage,
                claimedSetup.room,
                claimedSetup.playerSchema
            );
            this.assert.deepStrictEqual(claimedSetup.emittedEvents, ['reldens.afterAdStarted']);
            this.assert.strictEqual([...claimedSetup.emittedEventsData].pop().startResult, false);
            let brokenSetup = this.adsBuilder.createAdsSetup(false);
            brokenSetup.adsMessageActions.adsPlayedRepository.loadOne = async () => Promise.reject({message: 'Storage.'});
            this.assert.strictEqual(
                await brokenSetup.adsMessageActions.adStart(
                    brokenSetup.startedMessage,
                    brokenSetup.room,
                    brokenSetup.playerSchema
                ),
                false
            );
            this.assert.strictEqual([...brokenSetup.emittedEventsData].pop().startResult, false);
        });
    }

    async testAdStartDisablesAnAlivePlayer()
    {
        await this.test('the ad start disables an alive player with the disabled status', async () => {
            let adsSetup = this.adsBuilder.createAdsSetup(true);
            this.adsBuilder.storeStartedAd(adsSetup, 0);
            await adsSetup.adsMessageActions.adStart(adsSetup.startedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.deepStrictEqual(adsSetup.deactivatedStates, [GameConst.STATUS.DISABLED]);
        });
    }

    async testPlayerDisabledByAnAdIsActivatedAfterTheMaximumDuration()
    {
        await this.test('a player disabled by an ad that never ends is activated after the maximum duration', async () => {
            let adsSetup = this.adsBuilder.createAdsSetup(true);
            await adsSetup.adsMessageActions.adStart(adsSetup.startedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.strictEqual(adsSetup.playerSchema.state.inState, GameConst.STATUS.DISABLED);
            await timersPromises.setTimeout(AdsConst.VIDEOS_MINIMUM_DURATION / 100);
            this.assert.deepStrictEqual(adsSetup.activatedStates, [GameConst.STATUS.ACTIVE]);
            this.assert.strictEqual(adsSetup.playerSchema.state.inState, GameConst.STATUS.ACTIVE);
        });
    }

    async testAdStartKeepsADeadPlayerDead()
    {
        await this.test('the ad start keeps the death status of a dead player', async () => {
            let adsSetup = this.adsBuilder.createAdsSetup(true, GameConst.STATUS.DEATH);
            this.adsBuilder.storeStartedAd(adsSetup, 0);
            await adsSetup.adsMessageActions.adStart(adsSetup.startedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.deepStrictEqual(adsSetup.deactivatedStates, []);
            this.assert.strictEqual(adsSetup.playerSchema.state.inState, GameConst.STATUS.DEATH);
        });
    }

    async testAdEndedActivatesOnlyADisabledPlayer()
    {
        await this.test('the ad ended activates a disabled player and never revives a dead one', async () => {
            let disabledSetup = this.adsBuilder.createAdsSetup(true, GameConst.STATUS.DISABLED);
            this.adsBuilder.storeStartedAd(disabledSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
            await disabledSetup.adsMessageActions.adEnded(
                disabledSetup.endedMessage,
                disabledSetup.room,
                disabledSetup.playerSchema
            );
            this.assert.deepStrictEqual(disabledSetup.activatedStates, [GameConst.STATUS.ACTIVE]);
            let deadSetup = this.adsBuilder.createAdsSetup(true, GameConst.STATUS.DEATH);
            this.adsBuilder.storeStartedAd(deadSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
            await deadSetup.adsMessageActions.adEnded(deadSetup.endedMessage, deadSetup.room, deadSetup.playerSchema);
            this.assert.deepStrictEqual(deadSetup.activatedStates, []);
            this.assert.strictEqual(deadSetup.playerSchema.state.inState, GameConst.STATUS.DEATH);
        });
    }

}

module.exports.TestAdsRewardClaims = TestAdsRewardClaims;
