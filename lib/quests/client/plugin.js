/**
 *
 * Reldens - Quests Client Plugin
 *
 */

const { QuestsConst } = require('../constants');
const { PluginInterface } = require('../../features/plugin-interface');
const { Logger, sc } = require('@reldens/utils');

class QuestsClientPlugin extends PluginInterface
{

    setup(props)
    {
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.critical('EventsManager undefined in QuestsClientPlugin.');
            return false;
        }
        this.listenEvents();
    }

    listenEvents()
    {
        this.events.on('reldens.activateRoom', (room, gameManager) => {
            room.onMessage('*', (message) => {
                if(!message || message.act !== QuestsConst.QUESTS_TRACKING.MESSAGE_ACT){
                    return false;
                }
                gameManager.playerQuestsData = message.quests || [];
                this.events.emitSync(QuestsConst.QUESTS_TRACKING.EVENT_LOADED, gameManager.playerQuestsData, gameManager);
                return true;
            });
        });
    }

}

module.exports.QuestsClientPlugin = QuestsClientPlugin;
