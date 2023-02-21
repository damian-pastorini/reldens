/**
 *
 * Reldens - Rewards Server Plugin
 *
 */
const { PluginInterface } = require('../../features/plugin-interface');
const { sc, ErrorManager } = require('@reldens/utils');
const { ObjectSubscriber } = require('./subscribers/object-subscriber');
const { RewardsSubscriber } = require('./subscribers/rewards-subscriber');
const { WorldDropSubscriber } = require('./subscribers/world-drop-subscriber');

class RewardsPlugin extends PluginInterface
{

    setup(props)
    {
        this.events = sc.get(props, 'events', false);
        if (!this.events) {
            ErrorManager.error('EventsManager undefined in RewardsPlugin.');
        }

        this.events.on('reldens.afterRunAdditionalRespawnSetup', async (event) => {
            await ObjectSubscriber.enrichWithRewards(event.objInstance);
        });

        this.events.on('reldens.battleEnded', async (event) => {
            let { playerSchema, pve } = event;
            await RewardsSubscriber.giveRewards(playerSchema, pve?.targetObject, this.events);
        });

        this.events.on('reldens.sceneRoomOnCreate', async (scene) => {
            this.events.on('reldens.itemsRewardsDropped', async (rewardEventData) => {
                let rewards = await WorldDropSubscriber.dropRewardItem({ scene, rewardEventData });
                WorldDropSubscriber.sendRewardsDataToClient(rewards, scene.clients[0]);
            });
        });
    }
}

module.exports.RewardsPlugin = RewardsPlugin;
