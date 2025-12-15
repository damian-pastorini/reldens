/**
 *
 * Reldens - PlayerEnricher
 *
 * Enriches players with skills, class paths, and combat capabilities.
 *
 */

const { Pvp } = require('./pvp');
const { SkillsExtraDataMapper } = require('./skills-extra-data-mapper');
const { ClientWrapper } = require('../../game/server/client-wrapper');
const SkillsServer = require('@reldens/skills/lib/server');
const { StorageObserver } = require('./storage-observer');
const { SkillConst } = require('@reldens/skills');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('../../users/server/player').Player} Player
 * @typedef {import('../../rooms/server/scene').RoomScene} RoomScene
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 * @typedef {import('./models-manager').ModelsManager} ModelsManager
 *
 * @typedef {Object} PlayerEnricherProps
 * @property {ConfigManager} config
 * @property {EventsManager} events
 * @property {ModelsManager} skillsModelsManager
 */
class PlayerEnricher
{

    /**
     * @param {PlayerEnricherProps} props
     */
    constructor(props)
    {
        /** @type {ConfigManager} */
        this.config = props.config;
        /** @type {EventsManager} */
        this.events = props.events;
        /** @type {ModelsManager} */
        this.skillsModelsManager = props.skillsModelsManager;
        /** @type {boolean} */
        this.pvpEnabled = this.config.getWithoutLogs('server/actions/pvp/enabled', true);
        /** @type {Object} */
        this.pvpConfig = Object.assign({events: this.events}, this.config.get('server/actions/pvp'));
        /** @type {string} */
        this.affectedProperty = this.config.get('client/actions/skills/affectedProperty');
        /** @type {SkillsExtraDataMapper} */
        this.skillsExtraDataMapper = new SkillsExtraDataMapper();
    }

    /**
     * @param {RoomScene} roomGame
     * @param {Object} superInitialGameData
     * @returns {Promise<void>}
     */
    async withClassPath(roomGame, superInitialGameData)
    {
        //Logger.debug('Players Models:', superInitialGameData.players);
        if(!superInitialGameData.players){
            return;
        }
        for(let i of Object.keys(superInitialGameData.players)){
            let player = superInitialGameData.players[i];
            let classPath = await this.skillsModelsManager.loadOwnerClassPath(player.id);
            if(!classPath){
                continue;
            }
            player.currentLevel = classPath.currentLevel;
            player.currentClassPathLabel = classPath.related_skills_class_path.label;
            player.currentClassPathKey = player.avatarKey = classPath.related_skills_class_path.key;
        }
    }

    /**
     * @param {Player} currentPlayer
     * @param {RoomScene} room
     * @returns {Promise<void>}
     */
    async withActions(currentPlayer, room)
    {
        currentPlayer.actions = {};
        if(this.pvpEnabled && false !== sc.get(room.customData, 'pvpEnabled', true)){
            currentPlayer.actions['pvp'] = new Pvp(this.pvpConfig);
        }
        currentPlayer.getSkillExtraData = (params) => {
            return this.skillsExtraDataMapper.extractSkillExtraData(params);
        };
        currentPlayer.executePhysicalSkill = this.playerExecutePhysicalSkillCallback(
            currentPlayer,
            room.config.client.skills.animations
        );
    }

    /**
     * @param {Player} currentPlayer
     * @param {Object} skillsAnimationsData
     * @returns {Function}
     */
    playerExecutePhysicalSkillCallback(currentPlayer, skillsAnimationsData)
    {
        // @TODO - BETA - Replace with bind.
        return async (target, executedSkill) => {
            let messageData = Object.assign({skillKey: executedSkill.key}, executedSkill.owner.getPosition());
            if(sc.isObjectFunction(executedSkill.owner, 'getSkillExtraData')){
                let params = {skill: executedSkill, target};
                Object.assign(messageData, {extraData: executedSkill.owner.getSkillExtraData(params)});
            }
            await currentPlayer.skillsServer.client.runBehaviors(
                messageData,
                SkillConst.ACTION_SKILL_AFTER_CAST,
                SkillConst.BEHAVIOR_BROADCAST,
                executedSkill.getOwnerId()
            );
            let from = {x: currentPlayer.state.x, y: currentPlayer.state.y};
            executedSkill.initialPosition = from;
            let animData = sc.get(skillsAnimationsData, executedSkill.key + '_bullet', false);
            if(animData){
                executedSkill.animDir = sc.get(animData.animationData, 'dir', false);
            }
            // player disconnection would cause the physicalBody to be removed, so we need to validate it:
            let physicalBody = currentPlayer.physicalBody;
            if(!physicalBody){
                Logger.info('Player body is missing.');
                return false;
            }
            if(!physicalBody.world){
                Logger.error('Player body world is missing. Body ID: '+ physicalBody.id);
                return false;
            }
            physicalBody.world.shootBullet(from, {x: target.state.x, y: target.state.y}, executedSkill);
        };
    }

    /**
     * @param {Object} props
     * @param {Object} props.client
     * @param {Player} props.currentPlayer
     * @param {RoomScene} props.room
     * @param {ModelsManager} props.skillsModelsManager
     * @param {BaseDataServer} props.dataServer
     * @param {EventsManager} props.events
     * @returns {Promise<void>}
     */
    async withSkillsServerAndClassPath(props)
    {
        let {client, currentPlayer, room, skillsModelsManager, dataServer, events} = props;
        // @TODO - BETA - Improve prepareClassPathData to avoid loadOwnerClassPath double queries on each room.
        let classPathData = await skillsModelsManager.prepareClassPathData(
            currentPlayer,
            'player_id',
            room.config.skills.classPaths.classPathsById,
            room.config.skills.skillsList
        );
        if(!classPathData){
            return;
        }
        Object.assign(classPathData, {
            events: events,
            persistence: true,
            dataServer: dataServer,
            affectedProperty: this.affectedProperty,
            client: new ClientWrapper({client, room})
        });
        currentPlayer.skillsServer = new SkillsServer(classPathData);
        this.storageObserver = new StorageObserver({
            classPath: currentPlayer.skillsServer.classPath,
            dataServer: dataServer,
            modelsManager: skillsModelsManager,
        });
        this.storageObserver.registerListeners();
        currentPlayer.avatarKey = classPathData.key;
    }

}

module.exports.PlayerEnricher = PlayerEnricher;
