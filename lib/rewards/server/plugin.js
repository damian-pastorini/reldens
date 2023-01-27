/**
 *
 * Reldens - Rewards Server Plugin
 *
 */
const {PluginInterface} = require("../../features/plugin-interface");
const {sc} = require("@reldens/utils");
const {ObjectSubscriber} = require("./subscribers/object-subscriber");

class RewardsPlugin extends PluginInterface
{

    setup(props)
    {
        this.events = sc.get(props, 'events', false);
        if (!this.events) {
            console.log('EventsManager undefined in RewardsPlugin.');
        }

        this.events.on('reldens.afterRunAdditionalRespawnSetup', async (eventArg) => {
            await ObjectSubscriber.enrichWithRewards(eventArg.objInstance);
        });

        this.events.on('reldens.battleEnded', async (eventArg) => {
            const {playerSchema, pve} = eventArg;
            if (!pve.targetObject?.rewards) {
                return false;
            }
            pve.targetObject.rewards.forEach(async (rewardModel) => {
                const rewardItem = await pve.targetObject.dataServer.getEntity('item').loadById(rewardModel.item_id);
                let itemInstance = playerSchema.inventory.manager.createItemInstance(rewardItem.key);
                playerSchema.inventory.manager.addItem(itemInstance);
            });
        });
    }
}

module.exports.RewardsPlugin = RewardsPlugin;
