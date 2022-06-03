/**
 *
 * Reldens - Users Server Plugin.
 *
 */

const { InitialState } = require('../../users/server/initial-state');
const { InitialUser } = require('../../users/server/initial-user');
const { PluginInterface } = require('../../features/plugin-interface');
const { UsersConst } = require('../constants');
const { ObjectsConst } = require('../../objects/constants');
const { Logger, sc } = require('@reldens/utils');
const { SkillsEvents } = require('@reldens/skills');
const { ActionsConst } = require('../../actions/constants');

class UsersPlugin extends PluginInterface
{

    setup(props)
    {
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in UsersPlugin.');
        }
        this.dataServer = sc.get(props, 'dataServer', false);
        if(!this.dataServer){
            Logger.error('DataServer undefined in UsersPlugin.');
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
        let configProcessor = event.serverManager.configManager;
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
            return this.sendLifeBarUpdate(event);
        });
        this.events.on('reldens.actionsPrepareEventsListeners', async (actionsPack, classPath) => {
            // eslint-disable-next-line no-unused-vars
            classPath.listenEvent(SkillsEvents.SKILL_ATTACK_APPLY_DAMAGE, async (skill, target, damage, newValue) => {
                let client = skill.owner.skillsServer.client.client;
                if(sc.hasOwn(target, 'player_id')){
                    await this.updatePlayersLifebar(client.room, client, target);
                    return;
                }
                this.broadcastObjectUpdate(client, target);
            }, 'skillAttackApplyDamageLifebar', classPath.owner[classPath.ownerIdProperty]);
        });
        this.events.on('reldens.restoreObjectAfter', (event) => {
            this.broadcastObjectUpdate(event.room, event.enemyObject);
        });
    }

    broadcastObjectUpdate(room, enemyObject)
    {
        let data = {act: UsersConst.ACTION_LIFEBAR_UPDATE};
        data[ActionsConst.DATA_OWNER_TYPE] = ActionsConst.DATA_TYPE_VALUE_OBJECT;
        data[ActionsConst.DATA_OWNER_KEY] = enemyObject.broadcastKey;
        data['newValue'] = enemyObject.stats[this.lifeProp];
        data['totalValue'] = enemyObject.initialStats[this.lifeProp];
        room.broadcast('*', data);
    }

    sendLifeBarUpdate(event)
    {
        if(!this.lifeBarConfig.showEnemies && !this.lifeBarConfig.showOnClick){
            return false;
        }
        let {target, roomScene} = event;
        if(!target.stats[this.lifeProp]){
            return false;
        }
        this.broadcastObjectUpdate(roomScene, target)
    }

    async updatePlayersLifebar(roomScene, client, currentPlayer)
    {
        this.lifeBarConfig.showAllPlayers || this.lifeBarConfig.showOnClick
            ? await this.updateAllPlayersLifeBars(roomScene)
            : await this.onSavePlayerStatsUpdateClient(client, currentPlayer, roomScene);
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
                oT: ActionsConst.DATA_TYPE_VALUE_OBJECT,
                oK: obj.broadcastKey,
                newValue: obj.stats[this.lifeProp],
                totalValue: obj.initialStats[this.lifeProp]
            };
            roomScene.broadcast('*', updateData);
        }
    }

    async updateAllPlayersLifeBars(roomScene)
    {
        if(0 === roomScene.playersCountInState()){
            return false;
        }
        for(let i of roomScene.playersKeysFromState()){
            let player = roomScene.playerByIdFromState(i);
            let updateData = {
                act: UsersConst.ACTION_LIFEBAR_UPDATE,
                oT: ActionsConst.DATA_TYPE_VALUE_PLAYER,
                oK: player.sessionId,
                newValue: player.stats[this.lifeProp],
                totalValue: player.statsBase[this.lifeProp]
            };
            roomScene.broadcast('*', updateData);
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
        if(0 === loadedStats.length){
            return {stats, statsBase};
        }
        for(let loadedStat of loadedStats){
            let statData = this.stats[loadedStat.stat_id];
            stats[statData.key] = loadedStat.value;
            statsBase[statData.key] = loadedStat.base_value;
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
        this.lifeBarConfig.showAllPlayers || this.lifeBarConfig.showOnClick
            ? roomScene.broadcast('*', updateData)
            : client.send('*', updateData);
    }

}

module.exports.UsersPlugin = UsersPlugin;
