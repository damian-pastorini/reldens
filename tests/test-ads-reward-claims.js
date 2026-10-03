/**
 *
 * Reldens - Test Ads Reward Claims
 *
 */

const { BaseTest } = require('./base-test');
const { AdsMessageActions } = require('../lib/ads/server/message-actions');
const { AdsConst } = require('../lib/ads/constants');
const { sc } = require('@reldens/utils');

class TestAdsRewardClaims extends BaseTest
{

    createAdsSetup(replay)
    {
        let adsSetup = {storedRecords: {}, givenRewards: [], adId: 1, playerSchema: {player_id: 3}};
        let repository = {
            loadOne: async (filters) => sc.get(adsSetup.storedRecords, filters.player_id+'_'+filters.ads_id, null),
            updateById: async (recordId, newAdData) => Object.assign(adsSetup.storedRecords[recordId], newAdData)
        };
        adsSetup.adsMessageActions = new AdsMessageActions({dataServer: {getEntity: () => repository}});
        adsSetup.adsMessageActions.giveRewardAction = {
            execute: async (playerSchema, itemKey) => adsSetup.givenRewards.push(itemKey)
        };
        let adsCollection = {[adsSetup.adId]: {rewardItemKey: 'coins', provider: {key: 'test'}, replay}};
        adsSetup.room = {
            config: {get: () => adsCollection, getWithoutLogs: (path, defaultValue) => defaultValue},
            activatePlayer: () => true,
            deactivatePlayer: () => true
        };
        adsSetup.startedMessage = {act: AdsConst.ACTIONS.AD_STARTED, ads_id: adsSetup.adId};
        adsSetup.endedMessage = {act: AdsConst.ACTIONS.AD_ENDED, ads_id: adsSetup.adId};
        return adsSetup;
    }

    storeStartedAd(adsSetup, elapsedMs)
    {
        let startedAt = (new Date(sc.getTime() - elapsedMs)).toISOString().slice(0, 19).replace('T', ' ');
        let recordId = adsSetup.playerSchema.player_id+'_'+adsSetup.adId;
        adsSetup.storedRecords[recordId] = {
            id: recordId,
            player_id: adsSetup.playerSchema.player_id,
            ads_id: adsSetup.adId,
            started_at: startedAt,
            ended_at: null
        };
        return adsSetup.storedRecords[recordId];
    }

    async testRewardIsGivenOnceForTheSamePlayedAd()
    {
        await this.test('the reward is given once and a repeated ad ended message is rejected', async () => {
            let adsSetup = this.createAdsSetup(false);
            this.storeStartedAd(adsSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
            await adsSetup.adsMessageActions.adEnded(adsSetup.endedMessage, adsSetup.room, adsSetup.playerSchema);
            await adsSetup.adsMessageActions.adEnded(adsSetup.endedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.deepStrictEqual(adsSetup.givenRewards, ['coins']);
        });
    }

    async testConcurrentAdEndedMessagesGiveASingleReward()
    {
        await this.test('concurrent ad ended messages give a single reward', async () => {
            let adsSetup = this.createAdsSetup(false);
            this.storeStartedAd(adsSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
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
            let adsSetup = this.createAdsSetup(false);
            let storedAd = this.storeStartedAd(adsSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
            await adsSetup.adsMessageActions.adEnded(adsSetup.endedMessage, adsSetup.room, adsSetup.playerSchema);
            let claimedEndedAt = storedAd.ended_at;
            await adsSetup.adsMessageActions.adStart(adsSetup.startedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.strictEqual(storedAd.ended_at, claimedEndedAt);
            await adsSetup.adsMessageActions.adEnded(adsSetup.endedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.strictEqual(adsSetup.givenRewards.length, 1);
        });
    }

    async testReplayAdStartResetsTheEndedDate()
    {
        await this.test('starting a replay ad resets the ended date', async () => {
            let adsSetup = this.createAdsSetup(true);
            let storedAd = this.storeStartedAd(adsSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
            storedAd.ended_at = storedAd.started_at;
            await adsSetup.adsMessageActions.adStart(adsSetup.startedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.strictEqual(storedAd.ended_at, null);
        });
    }

}

module.exports.TestAdsRewardClaims = TestAdsRewardClaims;
