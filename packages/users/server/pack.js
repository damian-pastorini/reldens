/**
 *
 * Reldens - Users Server Package
 *
 */

const { InitialState } = require('../../users/server/initial-state');
const { InitialUser } = require('../../users/server/initial-user');
const { PackInterface } = require('../../features/server/pack-interface');
const { ModelsManager } = require('./models-manager');
const { EventsManagerSingleton, sc } = require('@reldens/utils');

class UsersPack extends PackInterface
{

    setupPack()
    {
        this.modelsManager = ModelsManager;
        EventsManagerSingleton.on('reldens.serverReady', async (event) => {
            await this.onServerReady(event);
        });
        EventsManagerSingleton.on('reldens.createPlayerBefore', async (client, authResult, currentPlayer, room) => {
            await this.onCreatePlayerBefore(client, authResult, currentPlayer, room);
        });
    }

    async onServerReady(event)
    {
        let configProcessor = event.serverManager.configManager.processor;
        if(!sc.hasOwn(configProcessor.server, 'players')){
            configProcessor.server.players = {};
        }
        configProcessor.server.players.initialState = InitialState;
        configProcessor.server.players.initialUser = InitialUser;
        if(sc.hasOwn(configProcessor.server.players, 'initialStats')){
            return true;
        }
        this.stats = {};
        this.statsByKey = {};
        let statsData = await this.modelsManager.stats.loadAll();
        if(statsData){
            for(let stat of statsData){
                stat.data = sc.getJson(stat.customData);
                this.stats[stat.id] = stat;
                this.statsByKey[stat.key] = stat;
            }
        }
        configProcessor.server.players.initialStats = this.statsByKey;
    }

    // eslint-disable-next-line no-unused-vars
    async onCreatePlayerBefore(client, authResult, room)
    {
        // @TODO - BETA.17 - Index [0] is temporal since for now we only have one player by user.
        let player = authResult.players[0];
        let {stats, statsBase} = await this.processStatsData('playerStats', player.id);
        player.stats = stats;
        player.statsBase = statsBase;
    }

    async processStatsData(model, playerId)
    {
        let loadedStats = await this.modelsManager[model].loadBy('player_id', playerId);
        let stats = {};
        let statsBase = {};
        if(loadedStats){
            for(let loadedStat of loadedStats){
                let statData = this.stats[loadedStat.stat_id];
                stats[statData.key] = loadedStat.value;
                statsBase[statData.key] = loadedStat.base_value;
            }
        }
        return {stats, statsBase};
    }

}

module.exports.UsersPack = UsersPack;
