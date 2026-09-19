/**
 *
 * Reldens - Quests Server Plugin
 *
 */

const { QuestsConst } = require('../constants');
const { PluginInterface } = require('../../features/plugin-interface');
const { Logger, sc } = require('@reldens/utils');

class QuestsPlugin extends PluginInterface
{

    setup(props)
    {
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.critical('EventsManager undefined in QuestsPlugin.');
            return false;
        }
        this.listenEvents();
    }

    listenEvents()
    {
        this.events.on('reldens.createPlayerAfter', async (client, userModel, currentPlayer, roomScene) => {
            await this.sendPlayerQuestsData(client, currentPlayer, roomScene);
        });
    }

    async sendPlayerQuestsData(client, currentPlayer, roomScene)
    {
        let playerId = sc.get(currentPlayer, 'player_id', false);
        if(!playerId){
            return false;
        }
        let entity = roomScene.dataServer.getEntity(QuestsConst.QUESTS_TRACKING.ENTITY);
        let results = await entity.load({OR: [{player_id: playerId}, {player_id: null}]});
        client.send('*', {
            act: QuestsConst.QUESTS_TRACKING.MESSAGE_ACT,
            quests: results ? results.map(q => q.quest_key) : []
        });
        return true;
    }

}

module.exports.QuestsPlugin = QuestsPlugin;
