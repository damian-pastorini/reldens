const { sc, Logger } = require('@reldens/utils');
const { PluginInterface } = require('../../features/plugin-interface');
const { RewardsMessageListener } = require('./rewards-message-listener');

class RewardsPlugin extends PluginInterface
{

    setup(props)
    {
        super.setup(props);
        if (!this.validateProps(props)) {
            return false;
        }
        this.events.on('reldens.joinedRoom', (room, gameManager) => {
            RewardsMessageListener.listenMessages(room, gameManager);
        });
    }

    validateProps(props)
    {
        let isValid = true;
        this.gameManager = sc.get(props, 'gameManager', false);
        if (!this.gameManager) {
            Logger.error('Game Manager undefined in RewardsPlugin.');
            isValid = false;
        }
        this.events = sc.get(props, 'events', false);
        if (!this.events) {
            Logger.error('EventsManager undefined in RewardsPlugin.');
            isValid = false;
        }
        return isValid;
    }


}

module.exports.RewardsPlugin = RewardsPlugin;