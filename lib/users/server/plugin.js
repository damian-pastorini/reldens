/**
 *
 * Reldens - UsersPlugin
 *
 * Server-side users plugin handling player stats, lifebars, and user management.
 *
 */

const { PluginInterface } = require('../../features/plugin-interface');
const { UsersConst } = require('../constants');
const { ObjectsConst } = require('../../objects/constants');
const { ActionsConst } = require('../../actions/constants');
const { SkillsEvents } = require('@reldens/skills');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 * @typedef {import('../../game/server/config-manager').ConfigManager} ConfigManager
 */
class UsersPlugin extends PluginInterface
{

    /**
     * @param {Object} props
     */
    async setup(props)
    {
        /** @type {EventsManager|boolean} */
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in UsersPlugin.');
        }
        /** @type {BaseDataServer|boolean} */
        this.dataServer = sc.get(props, 'dataServer', false);
        if(!this.dataServer){
            Logger.error('DataServer undefined in UsersPlugin.');
        }
        /** @type {ConfigManager|boolean} */
        this.config = sc.get(props, 'config', false);
        if(!this.config){
            Logger.error('Config undefined in UsersPlugin.');
        }
        /** @type {boolean} */
        this.usePlayerSpeedProperty = this.config.get('server/players/physicsBody/usePlayerSpeedProperty');
        /** @type {string} */
        this.playerSpeedPropertyPath = this.config.getWithoutLogs(
            'server/players/physicsBody/playerSpeedPropertyPath',
            'stats/speed'
        );
        // @TODO - BETA - Move LifeBar to its own package, convert into PropertyUpdater and make generic.
        /** @type {Object|boolean} */
        this.lifeBarConfig = false;
        /** @type {string|boolean} */
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

    /**
     * @param {Object} event
     * @returns {Promise<void>}
     */
    async onServerReady(event)
    {
        let configProcessor = event.serverManager.configManager;
        await this.preparePlayersStats(configProcessor);
        if(configProcessor.get('client/ui/lifeBar/enabled')){
            await this.activateLifeBar(configProcessor);
        }
    }

    /**
     * @param {Object} configProcessor
     * @returns {Promise<boolean|void>}
     */
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
        return true;
    }

    /**
     * @param {Object} actionsPack
     * @param {Object} classPath
     * @returns {Promise<void>}
     */
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

    /**
     * @param {Object} event
     * @returns {Promise<void>}
     */
    async broadcastObjectUpdateAfterRestore(event)
    {
        await this.broadcastObjectUpdate(event.room, event.enemyObject);
    }

    /**
     * @param {Object} client
     * @param {Object} userModel
     * @param {Object} playerSchema
     * @param {Object} roomScene
     * @returns {Promise<void>}
     */
    async updateLifeBars(client, userModel, playerSchema, roomScene)
    {
        await this.updatePlayersLifebar(roomScene, client, playerSchema);
        await this.updateEnemiesLifebar(roomScene);
    }

    /**
     * @param {Object} room
     * @param {Object} enemyObject
     * @returns {Promise<void>}
     */
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

    /**
     * @param {Object} event
     * @returns {Promise<boolean|void>}
     */
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

    /**
     * @param {Object} roomScene
     * @param {Object} client
     * @param {Object} playerSchema
     * @returns {Promise<boolean>}
     */
    async updatePlayersLifebar(roomScene, client, playerSchema)
    {
        if(this.lifeBarConfig.showAllPlayers || this.lifeBarConfig.showOnClick){
            return await this.updateAllPlayersLifeBars(roomScene);
        }
        return await this.updateClientsWithPlayerStats(client, playerSchema, roomScene);
    }

    /**
     * @param {Object} roomScene
     * @returns {Promise<boolean|void>}
     */
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

    /**
     * @param {Object} roomScene
     * @returns {Promise<boolean>}
     */
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

    /**
     * @param {Object} configProcessor
     * @returns {Promise<boolean>}
     */
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

    /**
     * @param {Object} client
     * @param {Object} userModel
     * @param {Object} currentPlayer
     * @param {Object} roomScene
     * @returns {Promise<boolean|void>}
     */
    async onCreatePlayerAfterAppendStats(client, userModel, currentPlayer, roomScene)
    {
        let {stats, statsBase} = await this.processStatsData('playersStats', currentPlayer.player_id);
        if(!stats){
            Logger.critical('Undefined player ID "'+currentPlayer?.player_id+'" stats.');
            return false;
        }
        if(!statsBase){
            Logger.critical('Undefined player ID "'+currentPlayer?.player_id+'" statsBase.');
            return false;
        }
        currentPlayer.stats = stats;
        currentPlayer.statsBase = statsBase;
        // @TODO - BETA - Remove hardcoded "speed" property and replace by configurable key.
        let playerSpeed = Number(sc.getByPath(currentPlayer, this.playerSpeedPropertyPath.split('/'), 0));
        if(this.usePlayerSpeedProperty && 0 < playerSpeed){
            currentPlayer.physicalBody.movementSpeed = playerSpeed;
            //Logger.debug('Use player speed: '+playerSpeed);
        }
        this.events.emit('reldens.createPlayerStatsAfter', client, userModel, currentPlayer, roomScene);
    }

    /**
     * @param {string} modelName
     * @param {number} playerId
     * @returns {Promise<Object|boolean>}
     */
    async processStatsData(modelName, playerId)
    {
        // @TODO - BETA - Improve login performance, on scene change avoid query by getting stats from existent player.
        if(!modelName){
            Logger.error('Undefined modelName to process stats data.');
            return false;
        }
        let modelRepository = this.dataServer.getEntity(modelName);
        if(!modelRepository){
            Logger.error('Missing repository to process stats data for model: '+modelName);
            return false;
        }
        let loadedStats = await modelRepository.loadBy('player_id', playerId);
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

    /**
     * @param {Object} client
     * @param {Object} playerSchema
     * @param {Object} roomScene
     * @returns {Promise<boolean>}
     */
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
