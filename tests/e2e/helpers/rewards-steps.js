/**
 *
 * Reldens - Rewards Steps
 *
 * The steps of the rewards events specs: the stored reward event of an action (dailyLogin or straightDaysLogin, read
 * from its event data), the rewards claimed like a client sends them, the stored claim state of a player (its JSON
 * parsed, compared on the expected keys only), the stored claim state of a player set for the group once its login
 * stored it, the event data or the columns of a reward event changed for the group
 * (restored by the group reset), the reward ids of the last rewards update a client received, a player action run
 * until the next rewards update arrives (the claim of an unknown reward id gets only the rewards update), the rewards
 * panel opened, a property changed on the three rewards events providers (the plugin, the events handler used by the
 * login state handler, and the claim message actions keep their own provider and cache), and the reward events cached
 * by those providers dropped for the group so the next update loads the stored events again.
 *
 */

const { expect } = require('@playwright/test');
const { RoomMessagesRecorder } = require('./room-messages-recorder');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { GameplayE2eStateApi } = require('./gameplay-e2e-state-api');
const { TradeSteps } = require('./trade-steps');
const { TimeConstants } = require('./time-constants');
const { Selectors } = require('../selectors');
const { RewardsConst } = require('../../../lib/rewards/constants');
const { sc } = require('@reldens/utils');

class RewardsSteps
{

    static PROVIDERS_PATHS = [
        'rewards/package/rewardsProvider',
        'rewards/package/rewardsEventsHandler/rewardsProvider',
        'rewards/package/rewardsEvents/rewardsProvider'
    ];
    static PROVIDER_CACHES = ['activeRewardsEvents', 'activeRewardsEventsMappedData'];
    static DAILY_LOGIN = 'dailyLogin';
    static STRAIGHT_DAYS_LOGIN = 'straightDaysLogin';
    static UNKNOWN_REWARD_ID = 999999;

    static async fetchRewardEvent(gameConfig, action)
    {
        let [rewardEvent] = (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'rewardsEvents', {})).filter(
            row => action === sc.toJson(row.event_data, {}).action
        );
        return rewardEvent;
    }

    static async claim(player, rewardsIds)
    {
        await RoomMessagesRecorder.sendMessages(
            player.page,
            rewardsIds.map(rewardId => ({act: RewardsConst.ACTIONS.ACCEPT_REWARD, id: rewardId}))
        );
    }

    static async fetchStoredState(gameConfig, playerId, rewardId)
    {
        let [stateRow] = await E2eSeedAndRestoreApi.loadRows(gameConfig, 'rewardsEventsState', {
            player_id: playerId,
            rewards_events_id: rewardId
        });
        return sc.toJson(stateRow?.state, {});
    }

    static async expectStoredState(gameConfig, playerId, rewardId, expectedState, message)
    {
        await expect.poll(
            async () => sc.pickProps(await RewardsSteps.fetchStoredState(gameConfig, playerId, rewardId), Object.keys(expectedState)),
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual(expectedState);
    }

    static async presetStoredState(context, playerId, rewardId, storedState)
    {
        let stateFilters = {player_id: playerId, rewards_events_id: rewardId};
        await expect.poll(
            async () => (await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'rewardsEventsState', stateFilters)).length,
            {message: 'The login stores the reward state', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(1);
        await E2eSeedAndRestoreApi.updateWithPreserve(context.gameConfig, context.e2eGroup, 'rewardsEventsState', stateFilters, {
            state: sc.toJsonString(storedState)
        });
    }

    static async changeRewardEvent(context, rewardId, rowChanges, eventDataChanges = {}, removedEventDataKeys = [])
    {
        let [rewardEvent] = await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'rewardsEvents', {id: rewardId});
        let eventData = Object.assign(sc.toJson(rewardEvent.event_data, {}), eventDataChanges);
        for(let removedKey of removedEventDataKeys){
            delete eventData[removedKey];
        }
        await E2eSeedAndRestoreApi.updateWithPreserve(context.gameConfig, context.e2eGroup, 'rewardsEvents', {id: rewardId}, Object.assign(
            {event_data: sc.toJsonString(eventData)},
            rowChanges
        ));
    }

    static async fetchLastUpdateIds(player)
    {
        return sc.get(
            [...await RoomMessagesRecorder.fetchMessages(player.page, RewardsConst.ACTIONS.UPDATE)].pop(),
            'rewards',
            []
        ).map(reward => reward.id).sort((idA, idB) => idA - idB);
    }

    static async runAndWaitForUpdate(player, playerAction)
    {
        let updatesCount = (await RoomMessagesRecorder.fetchMessages(player.page, RewardsConst.ACTIONS.UPDATE)).length;
        await playerAction();
        await TradeSteps.waitForMessages(player, RewardsConst.ACTIONS.UPDATE, updatesCount + 1);
    }

    static async openPanel(page)
    {
        await page.click(Selectors.hud.rewardsOpen);
        await expect(page.locator(Selectors.rewards.dialog), 'The rewards panel opens').toBeVisible();
    }

    static async changeProvidersProperty(context, propertyKey, value)
    {
        for(let providerPath of RewardsSteps.PROVIDERS_PATHS){
            let changed = await GameplayE2eStateApi.changeFeatureProperty(
                context.gameConfig,
                context.e2eGroup,
                providerPath,
                propertyKey,
                value
            );
            expect(changed.error, 'The '+propertyKey+' of '+providerPath+' is changed').toBeUndefined();
        }
    }

    static async dropCachedEvents(context)
    {
        for(let cacheProperty of RewardsSteps.PROVIDER_CACHES){
            await RewardsSteps.changeProvidersProperty(context, cacheProperty, false);
        }
    }

}

module.exports.RewardsSteps = RewardsSteps;
