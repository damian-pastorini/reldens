/**
 *
 * Reldens - Scores Client Plugin
 *
 */

const { PluginInterface } = require('../../features/plugin-interface');
const { Logger, sc } = require('@reldens/utils');

class ScoresPlugin extends PluginInterface
{

    setup(props)
    {
        this.gameManager = sc.get(props, 'gameManager', false);
        this.events = sc.get(props, 'events', false);
        if(this.validateProperties()){
            this.listenEvents();
        }
    }

    validateProperties()
    {
        if(!this.gameManager){
            Logger.error('Game Manager undefined in ScoresPlugin.');
            return false;
        }
        if(!this.events){
            Logger.error('EventsManager undefined in ScoresPlugin.');
            return false;
        }
        return true;
    }

    listenEvents()
    {
    }

}

module.exports.ScoresPlugin = ScoresPlugin;
