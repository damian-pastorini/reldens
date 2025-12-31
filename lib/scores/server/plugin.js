/**
 *
 * Reldens - Scores Server Plugin
 *
 * Initializes and manages the scores system on the server side.
 * Handles score increases on kills, initial scores data sending, and optional public scores route.
 *
 */

const { IncreaseScoreOnKillMapper } = require('./mapper/increase-score-on-kill-mapper');
const { IncreaseScoreOnKill } = require('./subscriber/increase-score-on-kill');
const { SendInitialScoresData } = require('./subscriber/send-initial-scores-data');
const { CreateScoresRoute } = require('./subscriber/create-scores-route');
const { ObjectsConst } = require('../../objects/constants');
const { GameConst } = require('../../game/constants');
const { PluginInterface } = require('../../features/plugin-interface');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 * @typedef {import('../../game/server/config-manager').ConfigManager} ConfigManager
 * @typedef {import('./subscriber/increase-score-on-kill').IncreaseScoreOnKill} IncreaseScoreOnKill
 * @typedef {import('./mapper/increase-score-on-kill-mapper').IncreaseScoreOnKillMapper} IncreaseScoreOnKillMapper
 * @typedef {import('./subscriber/create-scores-route').CreateScoresRoute} CreateScoresRoute
 * @typedef {import('./subscriber/send-initial-scores-data').SendInitialScoresData} SendInitialScoresData
 */
class ScoresPlugin extends PluginInterface
{

    /**
     * @param {Object} props
     * @returns {Promise<boolean>}
     */
    async setup(props)
    {
        /** @type {EventsManager|boolean} */
        this.events = sc.get(props, 'events', false);
        /** @type {ConfigManager|boolean} */
        this.config = sc.get(props, 'config', false);
        /** @type {BaseDataServer|boolean} */
        this.dataServer = sc.get(props, 'dataServer', false);
        /** @type {boolean} */
        this.enableFullTableView = this.config?.getWithoutLogs('server/scores/fullTableView/enabled', false);
        /** @type {string} */
        this.scoresPath = this.config.getWithoutLogs('server/scores/fullTableView/scoresPath', '/scores');
        /** @type {IncreaseScoreOnKill} */
        this.increaseScoreOnKill = new IncreaseScoreOnKill({config: this.config, dataServer: this.dataServer});
        /** @type {IncreaseScoreOnKillMapper} */
        this.increaseScoreOnKillMapper = new IncreaseScoreOnKillMapper();
        /** @type {CreateScoresRoute} */
        this.createScoresRoute = new CreateScoresRoute(props);
        /** @type {SendInitialScoresData} */
        this.sendInitialScoresData = new SendInitialScoresData(props);
        if(!this.validateProperties()){
            return false;
        }
        this.listenEvents();
        return true;
    }

    /**
     * @returns {boolean}
     */
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
        if(this.enableFullTableView){
            this.events.on('reldens.serverBeforeListen', async (event) => {
                return await this.createScoresRoute.execute(event, this.scoresPath);
            });
        }
        this.events.on('reldens.joinRoomEnd', async (event) => {
            return await this.sendInitialScoresData.execute(event.roomScene, event.client, event.loggedPlayer);
        });
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
