/**
 *
 * Reldens - AdsRewardClaimsBuilder
 *
 * Builds the ads message actions under test with the stubs they use: the played ads repository keeping the stored
 * records by player and ad, the reward action recording the given items, the event video ad in the config collection,
 * the room recording the activated and deactivated player states and every emitted event with its data (the reward
 * subscribers answer with the setup "continueReward" value), and the started, ended and failed messages of the ad. It
 * also stores a started ad record with its dates in the past.
 *
 */

const { AdsMessageActions } = require('../../lib/ads/server/message-actions');
const { EventVideo } = require('../../lib/ads/server/ads-type/event-video');
const { AdsConst } = require('../../lib/ads/constants');
const { GameConst } = require('../../lib/game/constants');
const { sc } = require('@reldens/utils');

class AdsRewardClaimsBuilder
{

    /**
     * @param {boolean} replay
     * @param {string|number} [inState]
     * @param {Object} [adModelData]
     * @returns {Object}
     */
    createAdsSetup(replay, inState = GameConst.STATUS.ACTIVE, adModelData = {})
    {
        let adsSetup = {
            storedRecords: {},
            givenRewards: [],
            emittedEvents: [],
            emittedEventsData: [],
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
        adsSetup.adsMessageActions = new AdsMessageActions({adsPlayedRepository: repository});
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
                    adsSetup.emittedEventsData.push(eventData);
                    eventData.continueEvent = adsSetup.continueReward;
                }
            }
        };
        adsSetup.startedMessage = {act: AdsConst.ACTIONS.AD_STARTED, ads_id: adsSetup.adId};
        adsSetup.endedMessage = {act: AdsConst.ACTIONS.AD_ENDED, ads_id: adsSetup.adId};
        adsSetup.failedMessage = {act: AdsConst.ACTIONS.AD_FAILED, ads_id: adsSetup.adId};
        return adsSetup;
    }

    /**
     * @param {Object} adsSetup
     * @param {number} startedElapsedMs
     * @param {number|null} [endedElapsedMs]
     * @returns {Object}
     */
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

}

module.exports.AdsRewardClaimsBuilder = AdsRewardClaimsBuilder;
