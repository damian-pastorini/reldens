/**
 *
 * Reldens - Test Ads Reward Claims
 *
 */

const { BaseTest } = require('./base-test');
const { AdsMessageActions } = require('../lib/ads/server/message-actions');
const { EventVideo } = require('../lib/ads/server/ads-type/event-video');
const { AdsConst } = require('../lib/ads/constants');
const { GameConst } = require('../lib/game/constants');
const { sc } = require('@reldens/utils');
const timersPromises = require('timers/promises');

class TestAdsRewardClaims extends BaseTest
{

    createAdsSetup(replay, inState = GameConst.STATUS.ACTIVE, adModelData = {})
    {
        let adsSetup = {
            storedRecords: {},
            givenRewards: [],
            emittedEvents: [],
            continueReward: true,
            activatedStates: [],
            deactivatedStates: [],
            adId: 1,
            playerSchema: {
                player_id: 3,
                sessionId: 'session3',
                state: {inState},
                privateData: {},
                getPrivate: (key) => adsSetup.playerSchema.privateData[key] || null,
                setPrivate: (key, data) => adsSetup.playerSchema.privateData[key] = data,
                isDeath: () => GameConst.STATUS.DEATH === adsSetup.playerSchema.state.inState,
                isDisabled: () => GameConst.STATUS.DISABLED === adsSetup.playerSchema.state.inState
            }
        };
        let repository = {
            loadOne: async (filters) => sc.get(adsSetup.storedRecords, filters.player_id+'_'+filters.ads_id, null),
            create: async (newAdData) => {
                let recordId = newAdData.player_id+'_'+newAdData.ads_id;
                adsSetup.storedRecords[recordId] = Object.assign({id: recordId}, newAdData);
                return adsSetup.storedRecords[recordId];
            },
            updateById: async (recordId, newAdData) => Object.assign(adsSetup.storedRecords[recordId], newAdData)
        };
        adsSetup.adsMessageActions = new AdsMessageActions({dataServer: {getEntity: () => repository}});
        adsSetup.adsMessageActions.giveRewardAction = {
            execute: async (playerSchema, itemKey) => adsSetup.givenRewards.push(itemKey)
        };
        let videoAd = EventVideo.fromModel(Object.assign({
            id: adsSetup.adId,
            key: 'test-reward-video',
            provider_id: 1,
            type_id: 2,
            replay,
            enabled: 1,
            related_ads_providers: {id: 1, key: 'crazyGames', enabled: 1},
            related_ads_event_video: {event_key: 'reldens.testEvent', event_data: '{"rewardItemKey":"coins","rewardItemQty":1}'}
        }, adModelData));
        adsSetup.configValues = {
            [AdsConst.CONFIG_PATHS.COLLECTION]: {[adsSetup.adId]: videoAd},
            [AdsConst.CONFIG_PATHS.VIDEOS_MAXIMUM_DURATION]: 1
        };
        adsSetup.room = {
            roomId: 'room-1',
            config: {getWithoutLogs: (path, defaultValue) => sc.get(adsSetup.configValues, path, defaultValue)},
            activePlayerBySessionId: () => ({playerData: adsSetup.playerSchema}),
            activatePlayer: (playerSchema, newState) => {
                adsSetup.activatedStates.push(newState);
                playerSchema.state.inState = newState;
            },
            deactivatePlayer: (playerSchema, newState) => {
                adsSetup.deactivatedStates.push(newState);
                playerSchema.state.inState = newState;
            },
            events: {
                emit: async (eventName, eventData) => {
                    adsSetup.emittedEvents.push(eventName);
                    eventData.continueEvent = adsSetup.continueReward;
                }
            }
        };
        adsSetup.startedMessage = {act: AdsConst.ACTIONS.AD_STARTED, ads_id: adsSetup.adId};
        adsSetup.endedMessage = {act: AdsConst.ACTIONS.AD_ENDED, ads_id: adsSetup.adId};
        adsSetup.failedMessage = {act: AdsConst.ACTIONS.AD_FAILED, ads_id: adsSetup.adId};
        return adsSetup;
    }

    storeStartedAd(adsSetup, startedElapsedMs, endedElapsedMs = null)
    {
        let recordId = adsSetup.playerSchema.player_id+'_'+adsSetup.adId;
        let currentTime = sc.getTime();
        let recordElapsedTimes = {started_at: startedElapsedMs, ended_at: endedElapsedMs};
        adsSetup.storedRecords[recordId] = {
            id: recordId,
            player_id: adsSetup.playerSchema.player_id,
            ads_id: adsSetup.adId
        };
        for(let dateField of Object.keys(recordElapsedTimes)){
            let pastDate = null === recordElapsedTimes[dateField]
                ? null
                : new Date(currentTime - recordElapsedTimes[dateField]);
            adsSetup.storedRecords[recordId][dateField] = pastDate
                ? pastDate.toISOString().slice(0, 19).replace('T', ' ')
                : null;
        }
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
            this.assert.deepStrictEqual(adsSetup.deactivatedStates, []);
            await adsSetup.adsMessageActions.adEnded(adsSetup.endedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.strictEqual(adsSetup.givenRewards.length, 1);
        });
    }

    async testReplayAdStartAfterTheCooldownResetsTheEndedDate()
    {
        await this.test('starting a replay ad after its replay cooldown resets the ended date', async () => {
            let adsSetup = this.createAdsSetup(true);
            let storedAd = this.storeStartedAd(
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
            let adsSetup = this.createAdsSetup(true);
            this.storeStartedAd(adsSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
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
            let adsSetup = this.createAdsSetup(true, GameConst.STATUS.ACTIVE, {
                related_ads_event_video: {
                    event_key: 'reldens.testEvent',
                    event_data: '{"rewardItemKey":"coins","rewardItemQty":1,"replayCooldown":0}'
                }
            });
            let storedAd = this.storeStartedAd(adsSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
            await adsSetup.adsMessageActions.adEnded(adsSetup.endedMessage, adsSetup.room, adsSetup.playerSchema);
            await adsSetup.adsMessageActions.adStart(adsSetup.startedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.strictEqual(storedAd.ended_at, null);
        });
    }

    async testDisabledAdCanNotBeStartedNorRewarded()
    {
        await this.test('a disabled ad can not be started nor rewarded', async () => {
            let adsSetup = this.createAdsSetup(true, GameConst.STATUS.ACTIVE, {enabled: 0});
            await adsSetup.adsMessageActions.adStart(adsSetup.startedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.deepStrictEqual(adsSetup.storedRecords, {});
            this.assert.deepStrictEqual(adsSetup.deactivatedStates, []);
            this.storeStartedAd(adsSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
            await adsSetup.adsMessageActions.adEnded(adsSetup.endedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.deepStrictEqual(adsSetup.givenRewards, []);
        });
    }

    async testAdOfADisabledProviderCanNotBeStartedNorRewarded()
    {
        await this.test('an ad of a disabled provider can not be started nor rewarded', async () => {
            let adsSetup = this.createAdsSetup(true, GameConst.STATUS.ACTIVE, {
                related_ads_providers: {id: 1, key: 'crazyGames', enabled: 0}
            });
            await adsSetup.adsMessageActions.adStart(adsSetup.startedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.deepStrictEqual(adsSetup.storedRecords, {});
            this.storeStartedAd(adsSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
            await adsSetup.adsMessageActions.adEnded(adsSetup.endedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.deepStrictEqual(adsSetup.givenRewards, []);
        });
    }

    async testAdEndedBeforeTheMinimumDurationIsNotRewarded()
    {
        await this.test('an ad ended before its minimum duration is not rewarded and stays open', async () => {
            let adsSetup = this.createAdsSetup(false);
            let storedAd = this.storeStartedAd(adsSetup, 0);
            await adsSetup.adsMessageActions.adEnded(adsSetup.endedMessage, adsSetup.room, adsSetup.playerSchema);
            await timersPromises.setTimeout(AdsConst.VIDEOS_MINIMUM_DURATION / 100);
            this.assert.deepStrictEqual(adsSetup.givenRewards, []);
            this.assert.strictEqual(storedAd.ended_at, null);
            this.storeStartedAd(adsSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
            await adsSetup.adsMessageActions.adEnded(adsSetup.endedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.deepStrictEqual(adsSetup.givenRewards, ['coins']);
        });
    }

    async testFailedAdIsClosedWithoutReward()
    {
        await this.test('a failed ad activates the player and is closed without reward', async () => {
            let adsSetup = this.createAdsSetup(false, GameConst.STATUS.DISABLED);
            let storedAd = this.storeStartedAd(adsSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
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
            let adsSetup = this.createAdsSetup(false);
            adsSetup.continueReward = false;
            let storedAd = this.storeStartedAd(adsSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
            await adsSetup.adsMessageActions.adEnded(adsSetup.endedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.deepStrictEqual(adsSetup.emittedEvents, ['reldens.beforeGiveAdRewardItem']);
            this.assert.deepStrictEqual(adsSetup.givenRewards, []);
            this.assert.notStrictEqual(storedAd.ended_at, null);
        });
    }

    async testAdStartDisablesAnAlivePlayer()
    {
        await this.test('the ad start disables an alive player with the disabled status', async () => {
            let adsSetup = this.createAdsSetup(true);
            this.storeStartedAd(adsSetup, 0);
            await adsSetup.adsMessageActions.adStart(adsSetup.startedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.deepStrictEqual(adsSetup.deactivatedStates, [GameConst.STATUS.DISABLED]);
        });
    }

    async testPlayerDisabledByAnAdIsActivatedAfterTheMaximumDuration()
    {
        await this.test('a player disabled by an ad that never ends is activated after the maximum duration', async () => {
            let adsSetup = this.createAdsSetup(true);
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
            let adsSetup = this.createAdsSetup(true, GameConst.STATUS.DEATH);
            this.storeStartedAd(adsSetup, 0);
            await adsSetup.adsMessageActions.adStart(adsSetup.startedMessage, adsSetup.room, adsSetup.playerSchema);
            this.assert.deepStrictEqual(adsSetup.deactivatedStates, []);
            this.assert.strictEqual(adsSetup.playerSchema.state.inState, GameConst.STATUS.DEATH);
        });
    }

    async testAdEndedActivatesOnlyADisabledPlayer()
    {
        await this.test('the ad ended activates a disabled player and never revives a dead one', async () => {
            let disabledSetup = this.createAdsSetup(true, GameConst.STATUS.DISABLED);
            this.storeStartedAd(disabledSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
            await disabledSetup.adsMessageActions.adEnded(
                disabledSetup.endedMessage,
                disabledSetup.room,
                disabledSetup.playerSchema
            );
            this.assert.deepStrictEqual(disabledSetup.activatedStates, [GameConst.STATUS.ACTIVE]);
            let deadSetup = this.createAdsSetup(true, GameConst.STATUS.DEATH);
            this.storeStartedAd(deadSetup, AdsConst.VIDEOS_MINIMUM_DURATION * 2);
            await deadSetup.adsMessageActions.adEnded(deadSetup.endedMessage, deadSetup.room, deadSetup.playerSchema);
            this.assert.deepStrictEqual(deadSetup.activatedStates, []);
            this.assert.strictEqual(deadSetup.playerSchema.state.inState, GameConst.STATUS.DEATH);
        });
    }

}

module.exports.TestAdsRewardClaims = TestAdsRewardClaims;
