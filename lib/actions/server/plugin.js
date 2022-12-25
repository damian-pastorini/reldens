/**
 *
 * Reldens - Actions Server Plugin
 *
 */

const { SkillConst, SkillsEvents } = require('@reldens/skills');
const SkillsServer = require('@reldens/skills/lib/server');
const { ModelsManager } = require('@reldens/skills/lib/server/storage/models-manager');
const { Logger, sc } = require('@reldens/utils');
const { ActionsMessageActions } = require('./message-actions');
const { ClientWrapper } = require('../../game/server/client-wrapper');
const { PluginInterface } = require('../../features/plugin-interface');
const { Pvp } = require('./pvp');
const { SkillsExtraData } = require('./skills/skills-extra-data');
const { InitialGameDataEnricher } = require('./initial-game-data-enricher');
const { PlayerEnricher } = require('./player-enricher');
const { DataLoader } = require('./data-loader');

class ActionsPlugin extends PluginInterface
{

    setup(props)
    {
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in ActionsPlugin.');
        }
        this.dataServer = sc.get(props, 'dataServer', false);
        this.skillsModelsManager = new ModelsManager({events: this.events, dataServer: this.dataServer});
        this.events.on('reldens.serverReady', async (event) => {
            await DataLoader.enrichConfig(event.serverManager.configManager, this.skillsModelsManager, this.dataServer);
        });
        this.events.on('reldens.beforeSuperInitialGameData', async (superInitialGameData, roomGame) => {
            await InitialGameDataEnricher.withClassPathLabels(roomGame, superInitialGameData);
            await PlayerEnricher.withClassPath(roomGame, superInitialGameData, this.dataServer);
        });
        this.events.on('reldens.roomsMessageActionsByRoom', async (roomMessageActions) => {
            roomMessageActions.actions = new ActionsMessageActions();
        });
        this.events.on('reldens.createdPlayerSchema', async (client, authResult, currentPlayer, room) => {
            await this.onCreatePlayerAfter(client, authResult, currentPlayer, room);
        });
        this.events.on('reldens.createdNewPlayer', async (player, loginData, loginManager) => {
            let defaultClassPathId = loginManager.config.get('server/players/actions/initialClassPathId');
            let initialClassPathId = sc.get(loginData, 'class_path_select', defaultClassPathId);
            let data = {
                class_path_id: initialClassPathId,
                owner_id: player.id,
                currentLevel: 1,
                currentExp: 0
            };
            return this.dataServer.entityManager.get('ownersClassPath').create(data);
        });
    }

    async onCreatePlayerAfter(client, authResult, currentPlayer, room)
    {
        this.appendActionsToPlayer(currentPlayer, room);
        await this.enrichPlayerWithClassPathAndSkills({client, currentPlayer, room});
        await this.attachEventListeners(currentPlayer.skillsServer.classPath);
    }

    async enrichPlayerWithClassPathAndSkills(props)
    {
        let {client, currentPlayer, room} = props;
        // prepare player classPath and skills data:
        let classPathData = await this.skillsModelsManager.prepareClassPathData(
            currentPlayer,
            'player_id',
            room.config.skills.classPaths.classPathsById,
            room.config.skills.skillsList
        );
        if(!classPathData){
            return;
        }
        Object.assign(classPathData, {
            events: this.events,
            persistence: true,
            dataServer: this.dataServer,
            affectedProperty: room.config.get('client/actions/skills/affectedProperty'),
            client: new ClientWrapper({client, room})
        });
        // append skills server to player:
        currentPlayer.skillsServer = new SkillsServer(classPathData);
        currentPlayer.avatarKey = classPathData.key;
    }

    appendActionsToPlayer(currentPlayer, room)
    {
        currentPlayer.actions = {};
        let pvpConfig = Object.assign({events: this.events}, room.config.get('server/actions/pvp'));
        if(pvpConfig){
            currentPlayer.actions['pvp'] = new Pvp(pvpConfig);
        }
        currentPlayer.executePhysicalSkill = async (target, executedSkill) => {
            let messageData = Object.assign({
                    skillKey: executedSkill.key
                },
                executedSkill.owner.getPosition()
            );
            if(sc.isFunction(executedSkill.owner, 'getSkillExtraData')){
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
            let to = {x: target.state.x, y: target.state.y};
            let animData = sc.get(room.config.client.skills.animations, executedSkill.key+'_bullet', false);
            if(animData){
                executedSkill.animDir = sc.get(animData.animationData, 'dir', false);
            }
            // player disconnection would cause the physicalBody to be removed, so we need to validate it:
            if(currentPlayer.physicalBody){
                if(!currentPlayer.physicalBody.world){
                    Logger.error('PhysicalBody world is null.', currentPlayer.physicalBody.id);
                    return false;
                }
                currentPlayer.physicalBody.world.shootBullet(from, to, executedSkill);
            }
            return false;
        };
        currentPlayer.getPosition = () => {
            return {
                x: currentPlayer.state.x,
                y: currentPlayer.state.y
            };
        };
        currentPlayer.getSkillExtraData = (params) => {
            return SkillsExtraData.extractSkillExtraData(params);
        }
    }

    async attachEventListeners(classPath)
    {
        let ownerId = classPath.getOwnerEventKey();
        classPath.listenEvent(
            SkillsEvents.SKILL_BEFORE_CAST,
            async (skill) => {
                if(this.validateSkillData(skill)){
                    return;
                }
                skill.owner.physicalBody.isBlocked = true;
            },
            'skillBeforeCastPack',
            ownerId
        );
        classPath.listenEvent(
            SkillsEvents.SKILL_AFTER_CAST,
            async (skill) => {
                if(this.validateSkillData(skill)){
                    return;
                }
                skill.owner.physicalBody.isBlocked = false;
            },
            'skillAfterCastPack',
            ownerId
        );
        await this.events.emit('reldens.actionsPrepareEventsListeners', this, classPath);
    }

    validateSkillData(skill)
    {
        let customDataJson = sc.toJson(skill.customData);
        return !customDataJson
            || !sc.get(customDataJson, 'blockMovement', false)
            || !sc.hasOwn(skill.owner, 'physicalBody');
    }
}

module.exports.ActionsPlugin = ActionsPlugin;
