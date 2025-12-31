/**
 *
 * Reldens - RewardsEventsHandler
 *
 * Manages reward event handlers by activating rewards and binding event listeners to their corresponding handlers.
 *
 */

const { LoginStateHandler } = require('./event-handlers/login-state-handler');
const { RewardsEventsProvider } = require('./rewards-events-provider');
const { RewardsEventsUpdater } = require('./rewards-events-updater');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManagerSingleton} EventsManager
 * @typedef {import('../../config/server/config').ConfigManager} ConfigManager
 */
class RewardsEventsHandler
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        /** @type {EventsManager|boolean} */
        this.events = sc.get(props, 'events', false);
        /** @type {ConfigManager|boolean} */
        this.config = sc.get(props, 'config', false);
        /** @type {RewardsEventsProvider} */
        this.rewardsProvider = new RewardsEventsProvider(props);
        /** @type {RewardsEventsUpdater} */
        this.rewardsEventsUpdater = new RewardsEventsUpdater(props);
        /** @type {Object<string, LoginStateHandler>} */
        this.handlers = {
            login: new LoginStateHandler({
                rewardsProvider: this.rewardsProvider,
                rewardsEventsUpdater: this.rewardsEventsUpdater,
                config: this.config
            })
        };
    }

    /**
     * @returns {Promise<boolean>}
     */
    async activateRewardsEvents()
    {
        if(!this.events){
            Logger.critical('EventsManager undefined in RewardsEventsHandler.');
            return false;
        }
        /** @type {Array<Object>|boolean} - CUSTOM DYNAMIC */
        this.activeRewards = await this.rewardsProvider.fetchActiveRewardsWithMappedData();
        for(let reward of this.activeRewards){
            let handlerKey = sc.get(reward, 'handler_key', '');
            if('' === handlerKey){
                Logger.error('Missing handler key to process event reward.', reward);
                continue;
            }
            if(reward.event_key && 0 < Object.keys(reward.eventData).length){
                let handler = sc.get(this.handlers, handlerKey, false);
                if(!handler){
                    Logger.warning('Unknown handler key to process event reward.', handlerKey, reward);
                    continue;
                }
                //Logger.debug('Reward Event handler assigned to event.', reward.id, reward.label, handlerKey);
                this.events.on(reward.event_key, this.updateEventState.bind(this, reward, handler));
            }
        }
    }

    /**
     * @param {Object} reward
     * @param {Object} handler
     * @param {...*} args
     */
    async updateEventState(reward, handler, ...args)
    {
        await handler.updateEventState(reward, args);
    }

}

module.exports.RewardsEventsHandler = RewardsEventsHandler;
