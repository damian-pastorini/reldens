/**
 *
 * Reldens - Rewards Server Plugin
 *
 */

const { ObjectSubscriber } = require('./subscribers/object-subscriber');
const { RewardsSubscriber } = require('./subscribers/rewards-subscriber');
const { RewardMessageActions } = require('./message-actions');
const { RewardsDropsProcessor } = require('./rewards-drops-processor');
const { TargetDeterminer } = require('./target-determiner');
const { PluginInterface } = require('../../features/plugin-interface');
const { Logger, sc } = require('@reldens/utils');

class RewardsPlugin extends PluginInterface
{

    setup(props)
    {
        this.events = sc.get(props, 'events', false);
        this.listenEvents();
    }

    listenEvents()
    {
        if(!this.events){
            Logger.critical('EventsManager undefined in RewardsPlugin.');
            return false;
        }
        this.events.on('reldens.featuresManagerLoadFeaturesAfter', this.appendPluginClasses.bind(this));
        this.events.on('reldens.afterRunAdditionalRespawnSetup', this.enrichObjectWithRewards.bind(this));
        this.events.on('reldens.battleEnded', this.battleEndedGiveRewards.bind(this));
        this.events.on('reldens.sceneRoomOnCreate', this.attachGiveRewardsEvent.bind(this));
        this.events.on('reldens.roomsMessageActionsGlobal', this.attachRewardMessageActions.bind(this));
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

    async processRewardsDrops(roomScene, rewardEventData)
    {
        await RewardsDropsProcessor.processRewardsDrops(roomScene, rewardEventData);
    }

    attachRewardMessageActions(roomMessageActions)
    {
        roomMessageActions.rewards = new RewardMessageActions(this.targetDeterminer);
    }

    async appendPluginClasses(event)
    {
        this.rewardsSubscriber = new RewardsSubscriber(event);
        this.targetDeterminer = new TargetDeterminer(event?.featuresManager?.featuresList?.teams.package);
    }

    async enrichObjectWithRewards(event)
    {
        await ObjectSubscriber.enrichWithRewards(event.objInstance);
    }

    async battleEndedGiveRewards(event)
    {
        await this.rewardsSubscriber.giveRewards(event.playerSchema, event.pve?.targetObject, this.events);
    }

}

module.exports.RewardsPlugin = RewardsPlugin;
