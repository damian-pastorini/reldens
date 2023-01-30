/**
 *
 * Reldens - Rewards Server Plugin
 *
 */
const { PluginInterface } = require('../../features/plugin-interface');
const { sc } = require('@reldens/utils');
const { ObjectSubscriber } = require('./subscribers/object-subscriber');
const { RewardsSubscriber } = require('./subscribers/rewards-subscriber');

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
            let { playerSchema, pve: {targetObject} = {} } = event
            await RewardsSubscriber.onBattleEnded(playerSchema, targetObject);
        });
    }
}

module.exports.RewardsPlugin = RewardsPlugin;
