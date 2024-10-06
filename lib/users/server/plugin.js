/**
 *
 * Reldens - UsersPlugin
 *
 */

const { PluginInterface } = require('../../features/plugin-interface');
const { UsersConst } = require('../constants');
const { ObjectsConst } = require('../../objects/constants');
const { ActionsConst } = require('../../actions/constants');
const { SkillsEvents } = require('@reldens/skills');
const { Logger, sc } = require('@reldens/utils');

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
        // @TODO - BETA - Move LifeBar to its own package, convert into PropertyUpdater and make generic.
        this.lifeBarConfig = false;
        this.lifeProp = false;
        this.listenEvents();
    }

    listenEvents()
    {
        if(!this.events){
            return false;
        }
        this.events.on('reldens.serverReady', async (event) => {
            await this.onServerReady(event);
        });
        this.events.on('reldens.createPlayerAfter', async (client, userModel, currentPlayer, roomScene) => {
            await this.onCreatePlayerAfterAppendStats(client, userModel, currentPlayer, roomScene);
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
        if(!this.events){
            return false;
        }
        if(!this.lifeBarConfig){
            this.lifeBarConfig = configProcessor.get('client/ui/lifeBar');
        }
        if(!this.lifeProp){
            this.lifeProp = configProcessor.get('client/actions/skills/affectedProperty');
        }
        this.events.on('reldens.createPlayerStatsAfter', this.updateLifeBars.bind(this));
        this.events.on('reldens.savePlayerStatsUpdateClient', this.updateClientsWithPlayerStats.bind(this));
        this.events.on('reldens.runBattlePveAfter', this.sendLifeBarUpdate.bind(this));
        this.events.on(
            'reldens.actionsPrepareEventsListeners',
            this.addEventListenerOnSkillAttackApplyDamage.bind(this)
        );
        this.events.on('reldens.restoreObjectAfter', this.broadcastObjectUpdateAfterRestore.bind(this));
    }

    async addEventListenerOnSkillAttackApplyDamage(actionsPack, classPath)
    {
        // @TODO - BETA - Make sure lifebar is updated on every stats change and not only after damage was applied.
        classPath.listenEvent(
            SkillsEvents.SKILL_ATTACK_APPLY_DAMAGE,
            async (skill, target) => {
                let client = skill.owner.skillsServer.client.client;
                if(sc.hasOwn(target, 'player_id')){
                    await this.updatePlayersLifebar(client.room, client, target);
                    return;
                }
                await this.broadcastObjectUpdate(client, target);
            },
            classPath.getOwnerUniqueEventKey('skillAttackApplyDamageLifebar'),
            classPath.getOwnerEventKey()
        );
    }

    async broadcastObjectUpdateAfterRestore(event)
    {
        await this.broadcastObjectUpdate(event.room, event.enemyObject);
    }

    async updateLifeBars(client, userModel, playerSchema, roomScene)
    {
        await this.updatePlayersLifebar(roomScene, client, playerSchema);
        await this.updateEnemiesLifebar(roomScene);
    }

    async broadcastObjectUpdate(room, enemyObject)
    {
        return room.broadcast('*', {
            act: UsersConst.ACTION_LIFEBAR_UPDATE,
            [ActionsConst.DATA_OWNER_TYPE]: ActionsConst.DATA_TYPE_VALUE_OBJECT,
            [ActionsConst.DATA_OWNER_KEY]: enemyObject.broadcastKey,
            newValue: enemyObject.stats[this.lifeProp],
            totalValue: enemyObject.initialStats[this.lifeProp]
        });
    }

    async sendLifeBarUpdate(event)
    {
        if(!this.lifeBarConfig.showEnemies && !this.lifeBarConfig.showOnClick){
            return false;
        }
        let {target, roomScene} = event;
        if(!target.stats[this.lifeProp]){
            return false;
        }
        await this.broadcastObjectUpdate(roomScene, target)
    }

    async updatePlayersLifebar(roomScene, client, playerSchema)
    {
        if(this.lifeBarConfig.showAllPlayers || this.lifeBarConfig.showOnClick){
            return await this.updateAllPlayersLifeBars(roomScene);
        }
        return await this.updateClientsWithPlayerStats(client, playerSchema, roomScene);
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
                [ActionsConst.DATA_OWNER_TYPE]: ActionsConst.DATA_TYPE_VALUE_OBJECT,
                [ActionsConst.DATA_OWNER_KEY]: obj.broadcastKey,
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
            let player = roomScene.playerBySessionIdFromState(i);
            if(!player?.stats || !player?.statsBase){
                continue;
            }
            let newValue = sc.get(player?.stats, this.lifeProp, null);
            let totalValue = sc.get(player?.statsBase, this.lifeProp, null);
            let playerSessionId = sc.get(player, 'sessionId', null);
            if(null === newValue || null === totalValue || null === playerSessionId){
                Logger.warning('Missing lifebar data for player update.', {newValue, totalValue, playerSessionId});
                continue;
            }
            let updateData = {
                act: UsersConst.ACTION_LIFEBAR_UPDATE,
                [ActionsConst.DATA_OWNER_TYPE]: ActionsConst.DATA_TYPE_VALUE_PLAYER,
                [ActionsConst.DATA_OWNER_KEY]: playerSessionId,
                newValue,
                totalValue
            };
            roomScene.broadcast('*', updateData);
        }
        return true;
    }

    async preparePlayersStats(configProcessor)
    {
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

    async onCreatePlayerAfterAppendStats(client, userModel, currentPlayer, roomScene)
    {
        let {stats, statsBase} = await this.processStatsData('playerStats', currentPlayer.player_id);
        if(!stats){
            Logger.critical('Undefined player stats.');
            return false;
        }
        if(!statsBase){
            Logger.critical('Undefined player statsBase.');
            return false;
        }
        currentPlayer.stats = stats;
        currentPlayer.statsBase = statsBase;
        let usePlayerSpeedProperty = roomScene.config.get('server/players/physicsBody/usePlayerSpeedProperty');
        let playerSpeed = Number(currentPlayer.stats?.speed || 0);
        if(usePlayerSpeedProperty && 0 < playerSpeed){
            currentPlayer.physicalBody.movementSpeed = playerSpeed;
            Logger.debug('Use player speed: '+playerSpeed);
        }
        this.events.emit('reldens.createPlayerStatsAfter', client, userModel, currentPlayer, roomScene);
    }

    async processStatsData(model, playerId)
    {
        let loadedStats = await this.dataServer.getEntity(model).loadBy('player_id', playerId);
        let stats = {};
        let statsBase = {};
        if(0 === loadedStats.length){
            return {stats, statsBase};
        }
        if(!this.stats){
            Logger.critical('Missing stats in Users Plugin.');
            return {stats, statsBase};
        }
        for(let loadedStat of loadedStats){
            let statData = this.stats[loadedStat.stat_id] || false;
            if(!statData){
                Logger.critical('Missing stat data for loaded stat.', this.stats, loadedStat);
                continue;
            }
            stats[statData.key] = loadedStat.value;
            statsBase[statData.key] = loadedStat.base_value;
        }
        return {stats, statsBase};
    }

    async updateClientsWithPlayerStats(client, playerSchema, roomScene)
    {
        if(
            client.sessionId !== playerSchema.sessionId
            && !this.lifeBarConfig.showAllPlayers
            && !this.lifeBarConfig.showOnClick
        ){
            return false;
        }
        let updateData = {
            act: UsersConst.ACTION_LIFEBAR_UPDATE,
            [ActionsConst.DATA_OWNER_TYPE]: ActionsConst.DATA_TYPE_VALUE_PLAYER,
            [ActionsConst.DATA_OWNER_KEY]: playerSchema.sessionId,
            newValue: playerSchema.stats[this.lifeProp],
            totalValue: playerSchema.statsBase[this.lifeProp]
        };
        if(this.lifeBarConfig.showAllPlayers || this.lifeBarConfig.showOnClick){
            roomScene.broadcast('*', updateData);
            return true;
        }
        client.send('*', updateData);
        return true;
    }

}

module.exports.UsersPlugin = UsersPlugin;
