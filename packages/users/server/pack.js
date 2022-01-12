/**
 *
 * Reldens - Users Server Package
 *
 */

const { InitialState } = require('../../users/server/initial-state');
const { InitialUser } = require('../../users/server/initial-user');
const { PackInterface } = require('../../features/pack-interface');
const { UsersConst } = require('../constants');
const { ObjectsConst } = require('../../objects/constants');
const { Logger, sc } = require('@reldens/utils');

class UsersPack extends PackInterface
{

    setupPack(props)
    {
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in UsersPack.');
        }
        this.dataServer = sc.get(props, 'dataServer', false);
        if(!this.dataServer){
            Logger.error('DataServer undefined in UsersPack.');
        }
        // @TODO - BETA - Move LifeBar to it's own package.
        this.lifeBarConfig = false;
        this.lifeProp = false;
        this.events.on('reldens.serverReady', async (event) => {
            await this.onServerReady(event);
        });
        this.events.on('reldens.createPlayerAfter', async (client, authResult, currentPlayer, roomScene) => {
            await this.onCreatePlayerAfterAppendStats(client, authResult, currentPlayer, roomScene);
        });
    }

    async onServerReady(event)
    {
        let configProcessor = event.serverManager.configManager.processor;
        await this.preparePlayersStats(configProcessor);
        if(configProcessor.get('client/ui/lifeBar/enabled')){
            await this.activateLifeBar(configProcessor);
        }
    }

    async activateLifeBar(configProcessor)
    {
        if(!this.lifeBarConfig){
            this.lifeBarConfig = configProcessor.get('client/ui/lifeBar');
        }
        if(!this.lifeProp){
            this.lifeProp = configProcessor.get('client/actions/skills/affectedProperty');
        }
        this.events.on('reldens.createPlayerAfter', async (client, authResult, currentPlayer, roomScene) => {
            await this.updatePlayersLifebar(roomScene, client, currentPlayer);
            await this.updateEnemiesLifebar(roomScene);
        });
        this.events.on('reldens.savePlayerStatsUpdateClient', async (client, target, roomScene) => {
            await this.onSavePlayerStatsUpdateClient(client, target, roomScene);
        });
        this.events.on('reldens.runBattlePveAfter', async (event) => {
            if(!this.lifeBarConfig.showEnemies && !this.lifeBarConfig.showOnClick){
                return false;
            }
            let {target, roomScene} = event;
            let targetLifePoints = target.stats[this.lifeProp];
            if(!targetLifePoints){
                return false;
            }
            let updateData = {
                act: UsersConst.ACTION_LIFEBAR_UPDATE,
                oT: 'o',
                oK: target.broadcastKey,
                newValue: targetLifePoints,
                totalValue: target.initialStats[this.lifeProp]
            };
            roomScene.broadcast(updateData);
        });
        this.events.on('reldens.restoreObjectAfter', (event) => {
            let updateData = {
                act: UsersConst.ACTION_LIFEBAR_UPDATE,
                oT: 'o',
                oK: event.enemyObject.broadcastKey,
                newValue: event.enemyObject.stats[this.lifeProp],
                totalValue: event.enemyObject.stats[this.lifeProp]
            };
            event.room.broadcast(updateData);
        });
    }

    async updatePlayersLifebar(roomScene, client, currentPlayer)
    {
        if(this.lifeBarConfig.showAllPlayers || this.lifeBarConfig.showOnClick){
            await this.updateAllPlayersLifeBars(roomScene);
        } else {
            await this.onSavePlayerStatsUpdateClient(client, currentPlayer, roomScene);
        }
    }

    async updateEnemiesLifebar(roomScene)
    {
        if(!this.lifeBarConfig.showEnemies && !this.lifeBarConfig.showOnClick){
            return false;
        }
        for(let i of Object.keys(roomScene.objectsManager.roomObjects)){
            let obj = roomScene.objectsManager.roomObjects[i];
            if(obj.type !== ObjectsConst.TYPE_ENEMY){
                continue;
            }
            let updateData = {
                act: UsersConst.ACTION_LIFEBAR_UPDATE,
                oT: 'o',
                oK: obj.broadcastKey,
                newValue: obj.stats[this.lifeProp],
                totalValue: obj.initialStats[this.lifeProp]
            };
            roomScene.broadcast(updateData);
        }
    }

    async updateAllPlayersLifeBars(roomScene)
    {
        for(let i of Object.keys(roomScene.state.players)){
            let player = roomScene.state.players[i];
            let updateData = {
                act: UsersConst.ACTION_LIFEBAR_UPDATE,
                oT: 'p',
                oK: player.sessionId,
                newValue: player.stats[this.lifeProp],
                totalValue: player.statsBase[this.lifeProp]
            };
            roomScene.broadcast(updateData);
        }
    }

    async preparePlayersStats(configProcessor)
    {
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
        let statsData = await this.dataServer.getEntity('stats').loadAll();
        if(statsData){
            for(let stat of statsData){
                stat.data = sc.toJson(stat.customData);
                this.stats[stat.id] = stat;
                this.statsByKey[stat.key] = stat;
            }
        }
        configProcessor.client.players.initialStats = this.statsByKey;
    }

    // eslint-disable-next-line no-unused-vars
    async onCreatePlayerAfterAppendStats(client, authResult, currentPlayer, room)
    {
        let {stats, statsBase} = await this.processStatsData('playerStats', currentPlayer.player_id);
        currentPlayer.stats = stats;
        currentPlayer.statsBase = statsBase;
    }

    async processStatsData(model, playerId)
    {
        let loadedStats = await this.dataServer.getEntity(model).loadBy('player_id', playerId);
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

    async onSavePlayerStatsUpdateClient(client, target, roomScene)
    {
        if(
            client.sessionId !== target.sessionId
            && !this.lifeBarConfig.showAllPlayers
            && !this.lifeBarConfig.showOnClick
        ){
            return false;
        }
        let updateData = {
            act: UsersConst.ACTION_LIFEBAR_UPDATE,
            oT: 'p',
            oK: target.sessionId,
            newValue: target.stats[this.lifeProp],
            totalValue: target.statsBase[this.lifeProp]
        };
        if(this.lifeBarConfig.showAllPlayers || this.lifeBarConfig.showOnClick){
            roomScene.broadcast(updateData);
        } else {
            roomScene.send(client, updateData);
        }
    }

}

module.exports.UsersPack = UsersPack;
