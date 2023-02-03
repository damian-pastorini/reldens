/**
 *
 * Reldens - Rewards Server Plugin
 *
 */
const { PluginInterface } = require('../../features/plugin-interface');
const { sc, ErrorManager } = require('@reldens/utils');
const { ObjectSubscriber } = require('./subscribers/object-subscriber');
const { RewardsSubscriber } = require('./subscribers/rewards-subscriber');

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
            let { playerSchema, pve } = event
            await RewardsSubscriber.giveRewards(playerSchema, pve?.targetObject, this.events);
        });
    }
}

module.exports.RewardsPlugin = RewardsPlugin;
