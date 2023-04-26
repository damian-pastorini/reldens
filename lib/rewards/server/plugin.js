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
const { ErrorManager, sc } = require('@reldens/utils');

class RewardsPlugin extends PluginInterface
{

    setup(props)
    {
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            ErrorManager.error('EventsManager undefined in RewardsPlugin.');
        }
        this.events.on('reldens.featuresManagerLoadFeaturesAfter', (event) => {
            this.rewardsSubscriber = new RewardsSubscriber(event);
            this.targetDeterminer = new TargetDeterminer(event?.featuresManager?.featuresList?.teams.package);
        });
        this.events.on('reldens.afterRunAdditionalRespawnSetup', async (event) => {
            await ObjectSubscriber.enrichWithRewards(event.objInstance);
        });
        this.events.on('reldens.battleEnded', async (event) => {
            await this.rewardsSubscriber.giveRewards(
                event.playerSchema,
                event.pve?.targetObject,
                this.events
            );
        });
        this.events.on('reldens.sceneRoomOnCreate', async (roomScene) => {
            this.events.on('reldens.afterGiveRewards', async (rewardEventData) => {
                await RewardsDropsProcessor.processRewardsDrops(roomScene, rewardEventData);
            });
        });
        this.events.on('reldens.roomsMessageActionsGlobal', (roomMessageActions) => {
            roomMessageActions.rewards = new RewardMessageActions(
                this.targetDeterminer
            );
        });
    }

}

module.exports.RewardsPlugin = RewardsPlugin;
