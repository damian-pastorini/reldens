/**
 *
 * Reldens - Scores Server Plugin
 *
 */

const { IncreaseScoreOnKillMapper } = require('./mapper/increase-score-on-kill-mapper');
const { IncreaseScoreOnKill } = require('./subscriber/increase-score-on-kill');
const { ObjectsConst } = require('../../objects/constants');
const { GameConst } = require('../../game/constants');
const { PluginInterface } = require('../../features/plugin-interface');
const { Logger, sc } = require('@reldens/utils');

class ScoresPlugin extends PluginInterface
{

    setup(props)
    {
        this.events = sc.get(props, 'events', false);
        this.config = sc.get(props, 'config', false);
        this.dataServer = sc.get(props, 'dataServer', false);
        if (this.validateProperties()){
            this.listenEvents();
            this.increaseScoreOnKill = new IncreaseScoreOnKill({config: this.config, dataServer: this.dataServer});
            this.increaseScoreOnKillMapper = new IncreaseScoreOnKillMapper();
        }
    }

    validateProperties()
    {
        if(!this.events){
            Logger.error('EventsManager undefined in ScoresPlugin.');
            return false;
        }
        if(!this.config){
            Logger.error('Config undefined in ScoresPlugin.');
            return false;
        }
        if(!this.dataServer){
            Logger.error('DataServer undefined in ScoresPlugin.');
            return false;
        }
        return true;
    }

    listenEvents()
    {
        this.events.on('reldens.playerDeath', async (event) => {
            await this.increaseScoreOnKill.execute(
                this.increaseScoreOnKillMapper.fromPlayerDeathEvent(event),
                GameConst.TYPE_PLAYER
            );
        });
        this.events.on('reldens.battleEnded', async (event) => {
            await this.increaseScoreOnKill.execute(
                this.increaseScoreOnKillMapper.fromBattleEndedEvent(event),
                ObjectsConst.TYPE_OBJECT
            );
        });
    }

}

module.exports.ScoresPlugin = ScoresPlugin;
