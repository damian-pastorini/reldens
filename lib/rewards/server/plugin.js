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
const { SendInitialRewardsData } = require('./subscribers/send-initial-rewards-data');
const { TargetDeterminer } = require('./target-determiner');
const { RewardsEventsMessageActions } = require('./rewards-events-message-actions');
const { PluginInterface } = require('../../features/plugin-interface');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

class RewardsPlugin extends PluginInterface
{

    setup(props)
    {
        this.events = sc.get(props, 'events', false);
        this.rewardsEventsHandler = new RewardsEventsHandler();
        this.sendInitialRewardsData = new SendInitialRewardsData(props);
        this.listenEvents();
    }

    listenEvents()
    {
        if(!this.events){
            Logger.critical('EventsManager undefined in RewardsPlugin.');
            return false;
        }
        this.events.on('reldens.featuresManagerLoadFeaturesAfter', this.appendPluginClasses.bind(this));
        this.events.on('reldens.createPlayerAfter', this.sendPlayerRewardsData.bind(this));
        this.events.on('reldens.playerDeath', this.playerDeathGiveEventRewards.bind(this));
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

    async sendPlayerRewardsData(client, userModel, playerSchema, room)
    {
        return await this.sendInitialRewardsData.execute(room, client,  playerSchema);
    }

    async playerDeathGiveEventRewards(event)
    {
        await this.increaseScoreOnKill.execute(
            this.increaseScoreOnKillMapper.fromPlayerDeathEvent(event),
            GameConst.TYPE_PLAYER
        );
    }

    async enrichObjectWithRewards(event)
    {
        await ObjectSubscriber.enrichWithRewards(event.objInstance);
    }

    async battleEndedGiveRewards(event)
    {
        await this.rewardsSubscriber.giveRewards(event.playerSchema, event.pve?.targetObject, this.events);
        await this.rewardsEventsHandler.processEventRewards(event);
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
        roomMessageActions.rewardsEvents = new RewardsEventsMessageActions();
    }

    async processRewardsDrops(roomScene, rewardEventData)
    {
        await RewardsDropsProcessor.processRewardsDrops(roomScene, rewardEventData);
    }

}

module.exports.RewardsPlugin = RewardsPlugin;
