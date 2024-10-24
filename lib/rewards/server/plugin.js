/**
 *
 * Reldens - Rewards Server Plugin
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

class RewardsPlugin extends PluginInterface
{

    async setup(props)
    {
        this.events = sc.get(props, 'events', false);
        this.rewardsEventsHandler = new RewardsEventsHandler(props);
        this.rewardsProvider = new RewardsEventsProvider(props);
        this.rewardsEvents = new RewardsEventsMessageActions(props);
        this.rewardsEventsDataSender = new RewardsEventsDataSender();
        this.listenEvents();
        await this.rewardsEventsHandler.activateRewardsEvents();
    }

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

    async appendPluginClasses(event)
    {
        this.rewardsSubscriber = new RewardsSubscriber(event);
        this.targetDeterminer = new TargetDeterminer(event?.featuresManager?.featuresList?.teams.package);
    }

    async sendPlayerRewardsData(event)
    {
        return this.rewardsEventsDataSender.sendUpdates(
            event.roomScene,
            event.loggedPlayer,
            await this.rewardsProvider.fetchPlayerActiveRewards(event.loggedPlayer.player_id)
        );
    }

    async enrichObjectWithRewards(event)
    {
        await ObjectSubscriber.enrichWithRewards(event.objInstance);
    }

    async battleEndedGiveRewards(event)
    {
        await this.rewardsSubscriber.giveRewards(event.playerSchema, event.pve?.targetObject, this.events);
    }

    async attachGiveRewardsEvent(roomScene)
    {
        this.events.onWithKey(
            'reldens.afterGiveRewards',
            this.processRewardsDrops.bind(this, roomScene),
            roomScene.roomName+'-'+roomScene.roomId+'-afterGiveRewards-'+sc.getTime(),
            roomScene.roomName+'-'+roomScene.roomId
        );
    }

    attachRewardMessageActions(roomMessageActions)
    {
        roomMessageActions.rewards = new RewardMessageActions(this.targetDeterminer);
        roomMessageActions.rewardsEvents = this.rewardsEvents;
    }

    async processRewardsDrops(roomScene, rewardEventData)
    {
        await RewardsDropsProcessor.processRewardsDrops(roomScene, rewardEventData);
    }

}

module.exports.RewardsPlugin = RewardsPlugin;
