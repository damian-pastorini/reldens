/**
 *
 * Reldens - Rewards Server Plugin
 *
 */
const { PluginInterface } = require('../../features/plugin-interface');
const { sc } = require('@reldens/utils');
const { ObjectSubscriber } = require('./subscribers/object-subscriber');

class RewardsPlugin extends PluginInterface
{

    setup(props)
    {
        this.events = sc.get(props, 'events', false);
        if (!this.events) {
            console.log('EventsManager undefined in RewardsPlugin.');
        }

        this.events.on('reldens.afterRunAdditionalRespawnSetup', async (event) => {
            await ObjectSubscriber.enrichWithRewards(event.objInstance);
        });

        this.events.on('reldens.battleEnded', async (event) => {
            let { playerSchema, pve } = event;
            let rewards = sc.get(pve.targetObject, 'rewards', false);
            if (false === rewards) {
                return false;
            }

            let itemsRepository = await pve.targetObject.dataServer.getEntity('item');
            for (let rewardModel of pve.targetObject.rewards) {
                const rewardItem = itemsRepository.loadById(rewardModel.item_id);
                await playerSchema.inventory.manager.addItem(
                    playerSchema.inventory.manager.createItemInstance(rewardItem.key)
                );
            }
        });
    }
}

module.exports.RewardsPlugin = RewardsPlugin;
