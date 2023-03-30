/**
 *
 * Reldens - Rewards Server Plugin
 *
 */

const { ObjectSubscriber } = require('./subscribers/object-subscriber');
const { RewardsSubscriber } = require('./subscribers/rewards-subscriber');
const { WorldDropSubscriber } = require('./subscribers/world-drop-subscriber');
const { RewardMessageActions } = require('./message-actions');
const { SenderDropSubscriber } = require('./subscribers/sender-drop-subscriber');
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
        this.events.on('reldens.afterRunAdditionalRespawnSetup', async (event) => {
            await ObjectSubscriber.enrichWithRewards(event.objInstance);
        });
        this.events.on('reldens.battleEnded', async (event) => {
            let { playerSchema, pve } = event;
            await RewardsSubscriber.giveRewards(playerSchema, pve?.targetObject, this.events);
        });
        this.events.on('reldens.sceneRoomOnCreate', async (roomScene) => {
            this.events.on('reldens.afterGiveRewards', async (rewardEventData) => {
                let rewards = await WorldDropSubscriber.createRewardItemObjectsOnRoom({
                    roomScene,
                    rewardEventData
                });
                if(!rewards){
                    return;
                }
                roomScene.disableOnDispose();
                SenderDropSubscriber.sendDropsToClient(rewards, roomScene);
            });
        });
        this.events.on('reldens.roomsMessageActionsGlobal', (roomMessageActions) => {
            roomMessageActions.rewards = new RewardMessageActions();
        });
    }

}

module.exports.RewardsPlugin = RewardsPlugin;
