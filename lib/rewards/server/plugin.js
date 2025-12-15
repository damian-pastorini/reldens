/**
 *
 * Reldens - Rewards Server Plugin
 *
 * Integrates the rewards system into the game by registering event listeners and coordinating reward distribution and events.
 *
 */

const { ObjectSubscriber } = require('./subscribers/object-subscriber');
const { RewardsSubscriber } = require('./subscribers/rewards-subscriber');
const { RewardMessageActions } = require('./reward-message-actions');
const { RewardsDropsProcessor } = require('./rewards-drops-processor');
const { RewardsEventsHandler } = require('./rewards-events-handler');
const { TargetDeterminer } = require('./target-determiner');
const { RewardsEventsProvider } = require('./rewards-events-provider');
const { RewardsEventsMessageActions } = require('./rewards-events-message-actions');
const { RewardsEventsDataSender } = require('./rewards-events-data-sender');
const { PluginInterface } = require('../../features/plugin-interface');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 */
class RewardsPlugin extends PluginInterface
{

    /**
     * @param {Object} props
     */
    async setup(props)
    {
        /** @type {EventsManager|boolean} */
        this.events = sc.get(props, 'events', false);
        /** @type {RewardsEventsHandler} */
        this.rewardsEventsHandler = new RewardsEventsHandler(props);
        /** @type {RewardsEventsProvider} */
        this.rewardsProvider = new RewardsEventsProvider(props);
        await this.rewardsProvider.fetchActiveRewardsWithMappedData();
        /** @type {RewardsEventsMessageActions} */
        this.rewardsEvents = new RewardsEventsMessageActions(props);
        /** @type {RewardsEventsDataSender} */
        this.rewardsEventsDataSender = new RewardsEventsDataSender();
        this.listenEvents();
        await this.rewardsEventsHandler.activateRewardsEvents();
    }

    /**
     * @returns {boolean}
     */
    listenEvents()
    {
        if(!this.events){
            Logger.critical('EventsManager undefined in RewardsPlugin.');
            return false;
        }
        this.events.on('reldens.featuresManagerLoadFeaturesAfter', this.appendPluginClasses.bind(this));
        this.events.on('reldens.joinRoomEnd', this.sendPlayerRewardsData.bind(this));
        this.events.on('reldens.afterRunAdditionalRespawnSetup', this.enrichObjectWithRewards.bind(this));
        this.events.on('reldens.battleEnded', this.battleEndedGiveRewards.bind(this));
        this.events.on('reldens.sceneRoomOnCreate', this.attachGiveRewardsEvent.bind(this));
        this.events.on('reldens.roomsMessageActionsGlobal', this.attachRewardMessageActions.bind(this));
    }

    /**
     * @param {Object} event
     */
    async appendPluginClasses(event)
    {
        /** @type {RewardsSubscriber} - CUSTOM DYNAMIC */
        this.rewardsSubscriber = new RewardsSubscriber(event);
        /** @type {TargetDeterminer} - CUSTOM DYNAMIC */
        this.targetDeterminer = new TargetDeterminer(event?.featuresManager?.featuresList?.teams.package);
    }

    /**
     * @param {Object} event
     * @returns {Promise<boolean>}
     */
    async sendPlayerRewardsData(event)
    {
        return this.rewardsEventsDataSender.sendUpdates(
            event.roomScene,
            event.loggedPlayer,
            await this.rewardsProvider.fetchPlayerActiveRewards(event.loggedPlayer.playerId)
        );
    }

    /**
     * @param {Object} event
     */
    async enrichObjectWithRewards(event)
    {
        await ObjectSubscriber.enrichWithRewards(event.objInstance);
    }

    /**
     * @param {Object} event
     */
    async battleEndedGiveRewards(event)
    {
        await this.rewardsSubscriber.giveRewards(event.playerSchema, event.pve?.targetObject, this.events);
    }

    /**
     * @param {Object} roomScene
     */
    async attachGiveRewardsEvent(roomScene)
    {
        this.events.onWithKey(
            'reldens.afterGiveRewards',
            this.processRewardsDrops.bind(this, roomScene),
            roomScene.roomName+'-'+roomScene.roomId+'-afterGiveRewards-'+sc.getTime(),
            roomScene.roomName+'-'+roomScene.roomId
        );
    }

    /**
     * @param {Object} roomMessageActions
     */
    attachRewardMessageActions(roomMessageActions)
    {
        roomMessageActions.rewards = new RewardMessageActions(this.targetDeterminer);
        roomMessageActions.rewardsEvents = this.rewardsEvents;
    }

    /**
     * @param {Object} roomScene
     * @param {Object} rewardEventData
     */
    async processRewardsDrops(roomScene, rewardEventData)
    {
        await RewardsDropsProcessor.processRewardsDrops(roomScene, rewardEventData);
    }

}

module.exports.RewardsPlugin = RewardsPlugin;
