/**
 *
 * Reldens - RewardsAcceptBuilder
 *
 * Builds the rewards events message actions over stubbed repositories, so the real provider, updater, mapper and data
 * sender run: the daily login reward event row with the given reward items, the players reward state rows (read and
 * saved in memory, every read waits one timers tick so overlapping accept messages really overlap, the read can reject
 * and the save can fail), the given items (every give or the give of some items can reject, and some items can be not
 * added) and the messages sent to every player client are recorded.
 *
 */

const { RewardsEventsMessageActions } = require('../../lib/rewards/server/rewards-events-message-actions');
const { RewardsConst } = require('../../lib/rewards/constants');
const { GameConst } = require('../../lib/game/constants');
const { sc } = require('@reldens/utils');
const timersPromises = require('timers/promises');

class RewardsAcceptBuilder
{

    constructor()
    {
        this.rewardEvent = {
            id: 1,
            label: 'rewards.dailyLogin',
            description: 'rewards.dailyDescription',
            position: 0,
            enabled: 1,
            event_data: '{"action":"dailyLogin","items":{"coins":1}}'
        };
        this.rewardItem = {id: 1, key: 'coins', label: 'Coins', description: null};
        this.rewardItemQuantity = 1;
        this.rewardItems = {[this.rewardItem.key]: this.rewardItemQuantity};
    }

    /**
     * @param {Object<number, Object|boolean>} playersStates
     * @param {Object} [options]
     * @returns {Object}
     */
    build(playersStates, options = {})
    {
        let setup = {givenItems: [], savedStates: [], sentMessages: [], stateRows: [], options};
        setup.rewardEvent = Object.assign({}, this.rewardEvent, {
            event_data: sc.toJsonString({action: 'dailyLogin', items: sc.get(options, 'rewardItems', this.rewardItems)})
        });
        for(let playerId of Object.keys(playersStates)){
            if(false === playersStates[playerId]){
                continue;
            }
            setup.stateRows.push({
                id: 100 + Number(playerId),
                rewards_events_id: this.rewardEvent.id,
                player_id: Number(playerId),
                state: sc.toJsonString(playersStates[playerId])
            });
        }
        setup.messageActions = new RewardsEventsMessageActions({
            config: {getWithoutLogs: () => ({})},
            dataServer: {getEntity: (entityName) => this.createRepositories(setup)[entityName]}
        });
        setup.messageActions.giveRewardAction = {
            execute: async (playerSchema, itemKey, quantity) => {
                if(setup.options.giveRejects){
                    return Promise.reject({message: 'Inventory.'});
                }
                if(sc.inArray(itemKey, sc.get(setup.options, 'rejectedItems', []))){
                    return Promise.reject({message: 'Inventory.'});
                }
                if(sc.inArray(itemKey, sc.get(setup.options, 'notAddedItems', []))){
                    return false;
                }
                setup.givenItems.push({playerId: playerSchema.player_id, itemKey, quantity});
                return true;
            }
        };
        setup.room = {
            roomId: 'room-1',
            activePlayerBySessionId: (sessionId) => ({client: this.createPlayerClient(setup, sessionId)})
        };
        return setup;
    }

    /**
     * @param {Object} setup
     * @param {string} sessionId
     * @returns {Object}
     */
    createPlayerClient(setup, sessionId)
    {
        return {
            send: (messageKey, message) => setup.sentMessages.push({sessionId, act: message[GameConst.ACTION_KEY]})
        };
    }

    /**
     * @param {Object} setup
     * @param {Object} filters
     * @returns {Promise<Object|null>}
     */
    async loadStateWithReward(setup, filters)
    {
        await timersPromises.setImmediate();
        if(setup.options.loadRejects){
            return Promise.reject({message: 'Storage.'});
        }
        let stateRow = setup.stateRows.find(row => filters.player_id === row.player_id);
        if(!stateRow){
            return null;
        }
        return Object.assign({}, stateRow, {related_rewards_events: Object.assign({}, setup.rewardEvent)});
    }

    /**
     * @param {Object} setup
     * @returns {Object<string, Object>}
     */
    createRepositories(setup)
    {
        return {
            rewardsEvents: {load: async () => [Object.assign({}, setup.rewardEvent)]},
            itemsItem: {load: async () => [Object.assign({}, this.rewardItem)]},
            rewardsEventsState: {
                loadOneWithRelations: async (filters) => await this.loadStateWithReward(setup, filters),
                load: async (filters) => setup.stateRows.filter(row => filters.player_id === row.player_id).map(
                    row => Object.assign({}, row)
                ),
                updateById: async (id, patch) => this.saveState(setup, id, patch),
                create: async (row) => row
            }
        };
    }

    /**
     * @param {Object} setup
     * @param {number} stateId
     * @param {Object} patch
     * @returns {Object|boolean}
     */
    saveState(setup, stateId, patch)
    {
        if(setup.options.saveFails){
            return false;
        }
        let stateRow = setup.stateRows.find(row => stateId === row.id);
        stateRow.state = patch.state;
        setup.savedStates.push({playerId: stateRow.player_id, state: sc.toJson(patch.state, {})});
        return stateRow;
    }

    /**
     * @param {Object} setup
     * @param {number} playerId
     * @param {string} [act]
     * @returns {Promise<boolean>}
     */
    async accept(setup, playerId, act = RewardsConst.ACTIONS.ACCEPT_REWARD)
    {
        return await setup.messageActions.executeMessageActions(
            {},
            {[GameConst.ACTION_KEY]: act, id: setup.rewardEvent.id},
            setup.room,
            {player_id: playerId, sessionId: 'session-'+playerId}
        );
    }

}

module.exports.RewardsAcceptBuilder = RewardsAcceptBuilder;
