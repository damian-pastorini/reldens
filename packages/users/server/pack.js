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
const { UsersConst } = require('../constants');

class UsersPack extends PackInterface
{

    setupPack()
    {
        this.modelsManager = ModelsManager;
        this.lifeBarConfig = false;
        this.skillsAffectedProperty = false;
        EventsManagerSingleton.on('reldens.serverReady', async (event) => {
            await this.onServerReady(event);
        });
        EventsManagerSingleton.on('reldens.createPlayerAfter', async (client, authResult, currentPlayer, roomScene) => {
            await this.onCreatePlayerAfter(client, authResult, currentPlayer, roomScene);
            if(!this.lifeBarConfig){
                this.lifeBarConfig = roomScene.config.get('client/ui/lifeBar');
            }
            if(!this.skillsAffectedProperty){
                this.skillsAffectedProperty = roomScene.config.get('client/actions/skills/affectedProperty');
            }
            if(this.lifeBarConfig.enabled){
                if(this.lifeBarConfig.showAllPlayers){
                    for(let i of Object.keys(roomScene.state.players)){
                        let player = roomScene.state.players[i];
                        let updateData = {
                            act: UsersConst.ACTION_LIFEBAR_UPDATE,
                            oT: 'p',
                            oK: player.sessionId,
                            newValue: player.stats[this.skillsAffectedProperty],
                            totalValue: player.statsBase[this.skillsAffectedProperty]
                        };
                        roomScene.broadcast(updateData);
                    }
                } else {
                    await this.onSavePlayerStatsUpdateClient(client, currentPlayer, roomScene);
                }
            }
        });
        EventsManagerSingleton.on('reldens.savePlayerStatsUpdateClient', async (client, target, roomScene) => {
            if(this.lifeBarConfig.enabled){
                await this.onSavePlayerStatsUpdateClient(client, target, roomScene);
            }
        });
    }

    async onServerReady(event)
    {
        let configProcessor = event.serverManager.configManager.processor;
        if(!sc.hasOwn(configProcessor.server, 'players')){
            configProcessor.server.players = {};
        }
        if(!sc.hasOwn(configProcessor.client, 'players')){
            configProcessor.client.players = {};
        }
        configProcessor.server.players.initialState = InitialState;
        configProcessor.server.players.initialUser = InitialUser;
        if(sc.hasOwn(configProcessor.client.players, 'initialStats')){
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
        configProcessor.client.players.initialStats = this.statsByKey;
    }

    // eslint-disable-next-line no-unused-vars
    async onCreatePlayerAfter(client, authResult, currentPlayer, room)
    {
        let {stats, statsBase} = await this.processStatsData('playerStats', currentPlayer.player_id);
        currentPlayer.stats = stats;
        currentPlayer.statsBase = statsBase;
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

    // eslint-disable-next-line no-unused-vars
    async onSavePlayerStatsUpdateClient(client, target, roomScene)
    {
        let updateData = {
            act: UsersConst.ACTION_LIFEBAR_UPDATE,
            oT: 'p',
            oK: target.sessionId,
            newValue: target.stats[this.skillsAffectedProperty],
            totalValue: target.statsBase[this.skillsAffectedProperty]
        };
        if(this.lifeBarConfig.showAllPlayers){
            roomScene.broadcast(updateData);
        } else {
            if(client.sessionId === target.sessionId){
                roomScene.send(client, updateData);
            }
        }
    }

}

module.exports.UsersPack = UsersPack;
