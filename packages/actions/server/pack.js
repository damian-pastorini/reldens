/**
 *
 * Reldens - Actions Server Package
 *
 * This pack will append to the config processor all the information required by both the server and the client.
 * This will also create an instance of each skill to be called and used on the players later.
 *
 */

const { SkillsServer, SkillConst, SkillsEvents } = require('@reldens/skills');
const { ModelsManager } = require('@reldens/skills/lib/server/storage/models-manager');
const { EventsManagerSingleton, sc } = require('@reldens/utils');
const { ActionsMessageActions } = require('./message-actions');
const { ClientWrapper } = require('../../game/server/client-wrapper');
const { PackInterface } = require('../../features/server/pack-interface');
const { Pvp } = require('./pvp');
const { TypeAttack, TypeEffect, TypePhysicalAttack, TypePhysicalEffect } = require('./skills/types');
const { AnimationsModel } = require('./animations-model');
const { LevelAnimationsModel } = require('./level-animations-model');

class ActionsPack extends PackInterface
{

    setupPack()
    {
        this.skillsModelsManager = new ModelsManager({events: EventsManagerSingleton});
        EventsManagerSingleton.on('reldens.serverReady', async (event) => {
            await this.onServerReady(event);
        });
        EventsManagerSingleton.on('reldens.beforeSuperInitialGameData', async (superInitialGameData, roomGame) => {
            await this.onBeforeSuperInitialGameData(superInitialGameData, roomGame);
        });
        // eslint-disable-next-line no-unused-vars
        EventsManagerSingleton.on('reldens.roomsMessageActionsByRoom', async (roomMessageActions, roomName) => {
            roomMessageActions.actions = new ActionsMessageActions();
        });
        EventsManagerSingleton.on('reldens.createdPlayerSchema', async (client, authResult, currentPlayer, room) => {
            await this.onCreatePlayerAfter(client, authResult, currentPlayer, room);
        });
        EventsManagerSingleton.on('reldens.createdNewPlayer', async (player, loginData, loginManager) => {
            let defaultClassPathId = loginManager.config.get('server/players/actions/initialClassPathId');
            let initialClassPathId = sc.getDef(loginData, 'class_path_select', defaultClassPathId);
            let data = {
                class_path_id: initialClassPathId,
                owner_id: player.id,
                currentLevel: 1,
                currentExp: 0
            };
            return this.skillsModelsManager.models['ownersClassPath'].query().insert(data);
        });
    }

    async onServerReady(event)
    {
        let configProcessor = event.serverManager.configManager.processor;
        if(!sc.hasOwn(configProcessor, 'skills')){
            configProcessor.skills = {skillsList: {}};
        }
        if(!sc.hasOwn(configProcessor.skills, 'defaultSkills')){
            configProcessor.skills.defaultSkills = {};
        }
        configProcessor.skills.defaultSkills[SkillConst.SKILL_TYPE_ATTACK] = TypeAttack;
        configProcessor.skills.defaultSkills[SkillConst.SKILL_TYPE_EFFECT] = TypeEffect;
        configProcessor.skills.defaultSkills[SkillConst.SKILL_TYPE_PHYSICAL_ATTACK] = TypePhysicalAttack;
        configProcessor.skills.defaultSkills[SkillConst.SKILL_TYPE_PHYSICAL_EFFECT] = TypePhysicalEffect;
        await this.loadSkillsFullList(configProcessor);
        await this.loadGroupsFullList(configProcessor);
        await this.loadClassPathFullList(configProcessor);
        await this.appendSkillsAnimations(configProcessor);
        await this.appendLevelsAnimations(configProcessor);
    }

    async onBeforeSuperInitialGameData(superInitialGameData, roomGame)
    {
        if(roomGame.config.skills.classPaths.classPathsByKey){
            let classPathsLabelsByKey = {};
            for(let i of Object.keys(roomGame.config.skills.classPaths.classPathsByKey)){
                let classPath = roomGame.config.skills.classPaths.classPathsByKey[i];
                classPathsLabelsByKey[classPath.data.id] = {key: i, label: classPath.data.label};
            }
            superInitialGameData.classesData = classPathsLabelsByKey;
        }
        if(roomGame.config.get('client/players/multiplePlayers/enabled') && superInitialGameData.players){
            for(let i of Object.keys(superInitialGameData.players)){
                let player = superInitialGameData.players[i];
                let classPathCollection = await this.skillsModelsManager.models['ownersClassPath']
                    .loadOwnerClassPath(player.id);
                if(!classPathCollection.length){
                    continue;
                }
                // @TODO - BETA - Temporal index[0] for a single class path by player.
                let classPath = classPathCollection[0];
                player.additionalLabel = ' - LvL '+classPath.currentLevel
                    +' - '+classPath.owner_full_class_path.label;
                player.currentClassPathLabel =
                player.avatarKey = classPath.owner_full_class_path.key;
            }
        }
    }

    async onCreatePlayerAfter(client, authResult, currentPlayer, room)
    {
        this.appendActionsToPlayer(currentPlayer, room);
        // prepare player classPath and skills data:
        let classPathData = await this.skillsModelsManager.prepareClassPathData(
            currentPlayer,
            'player_id',
            room.config.skills.classPaths.classPathsById,
            room.config.skills.skillsList
        );
        if(classPathData){
            classPathData.events = EventsManagerSingleton;
            classPathData.affectedProperty = room.config.get('client/actions/skills/affectedProperty');
            classPathData.client = new ClientWrapper(client, room);
            // append skills server to player:
            currentPlayer.skillsServer = new SkillsServer(classPathData);
            currentPlayer.avatarKey = classPathData.key;
            this.prepareEventsListeners(currentPlayer.skillsServer.classPath);
        }
    }

    async loadSkillsFullList(configProcessor)
    {
        // see theme/packages/server.js:
        let skillsClasses = configProcessor.get('server/customClasses/skills/skillsList');
        // defined in this same class on the reldens.serverReady listener:
        Object.assign(skillsClasses, configProcessor.skills.defaultSkills);
        configProcessor.skills = await this.skillsModelsManager.prepareSkillsInstancesList(skillsClasses);
    }

    async loadGroupsFullList(configProcessor)
    {
        let groupsModels = await this.skillsModelsManager.models.skillGroups.loadAll();
        if(groupsModels.length){
            configProcessor.skills.groups = groupsModels;
        }
    }

    async loadClassPathFullList(configProcessor)
    {
        let classPathClasses = configProcessor.get('server/customClasses/skills/classPath');
        configProcessor.skills.classPaths = await this.skillsModelsManager
            .prepareClassPathInstancesList(classPathClasses);
    }

    appendActionsToPlayer(currentPlayer, room)
    {
        currentPlayer.actions = {};
        let pvpConfig = room.config.get('server/actions/pvp');
        if(pvpConfig){
            currentPlayer.actions['pvp'] = new Pvp(pvpConfig);
        }
        currentPlayer.executePhysicalSkill = async (target, executedSkill) => {
            let messageData = Object.assign({
                    skillKey: executedSkill.key
                },
                executedSkill.owner.getPosition()
            );
            if(typeof executedSkill.owner.getSkillExtraData === 'function'){
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
            let animData = sc.getDef(room.config.client.skills.animations, executedSkill.key+'_bullet', false);
            if(animData){
                executedSkill.animDir = sc.getDef(animData.animationData, 'dir', false);
            }
            // player disconnection would cause the physicalBody to be removed so we need to validate it:
            if(currentPlayer.physicalBody){
                let bulletBody = currentPlayer.physicalBody.world.shootBullet(from, to, executedSkill);
                bulletBody.onHit = (onHitData) => {
                    executedSkill.onHit(onHitData);
                };
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
            return this.prepareExtraData(params);
        }
    }

    prepareExtraData(params)
    {
        // @TODO - BETA - Refactor and replace by constants.
        let extraData = {};
        if(sc.hasOwn(params, 'target')){
            if(sc.hasOwn(params.target, 'key')){
                extraData.tT = 'e'; // enemy
                extraData.tK = params.target.key;
            }
            if(sc.hasOwn(params.target, 'sessionId')){
                extraData.tT = 'p';
                extraData.tK = params.target.sessionId;
            }
        }
        if(sc.hasOwn(params, 'skill')){
            if(sc.hasOwn(params.skill.owner, 'key')){
                extraData.oT = 'e'; // enemy
                extraData.oK = params.skill.owner.key;
            }
            if(sc.hasOwn(params.skill.owner, 'sessionId')){
                extraData.oT = 'p';
                extraData.oK = params.skill.owner.sessionId;
            }
        }
        return extraData;
    }

    async appendSkillsAnimations(config)
    {
        let models = await AnimationsModel.loadAllWithSkill();
        if(models.length){
            for(let skillAnim of models){
                let animationData = sc.getJson(skillAnim.animationData, {});
                let customDataJson = sc.getJson(skillAnim.skill.customData);
                if(customDataJson){
                    if(sc.hasOwn(customDataJson, 'blockMovement')){
                        animationData.blockMovement = customDataJson.blockMovement;
                    }
                }
                config.client.skills.animations[skillAnim.skill.key+'_'+skillAnim.key] = {
                    skillId: skillAnim.skill_id,
                    skillKey: skillAnim.skill.key,
                    key: skillAnim.key,
                    class: skillAnim.classKey,
                    animationData
                }
            }
        }
        return config.client.skills.animations;
    }

    async appendLevelsAnimations(config)
    {
        if(!sc.hasOwn(config.client, 'levels')){
            config.client.levels = {};
        }
        let models = await LevelAnimationsModel.loadAllWithClassAndLevel();
        if(models.length){
            if(!sc.hasOwn(config.client.levels, 'animations')){
                config.client.levels.animations = {};
            }
            for(let levelAnim of models){
                let animationData = sc.getJson(levelAnim.animationData, {});
                let animKey = 'level_' + ((!levelAnim.level && !levelAnim.class_path) ? 'default' : (
                    levelAnim.class_path ? levelAnim.class_path.key : ''
                    + (levelAnim.level ? (levelAnim.class_path ? '_' : '')+levelAnim.level.id : '')
                ));
                config.client.levels.animations[animKey] = {
                    key: animKey,
                    levelId: levelAnim.level ? levelAnim.level.id : null,
                    classKey: levelAnim.class_path ? levelAnim.class_path.key : null,
                    animationData
                }
            }
        }
        return config.client.levels.animations;
    }

    prepareEventsListeners(classPath)
    {
        let ownerId = classPath.getOwnerEventKey();
        // eslint-disable-next-line no-unused-vars
        classPath.listenEvent(SkillsEvents.SKILL_BEFORE_CAST, async (skill, target) => {
            let customDataJson = sc.getJson(skill.customData);
            if(
                !customDataJson
                || !sc.getDef(customDataJson, 'blockMovement', false)
                || !sc.hasOwn(skill.owner, 'physicalBody')
            ){
                return;
            }
            skill.owner.physicalBody.isBlocked = true;
        }, 'skillBeforeCastPack', ownerId);
        // eslint-disable-next-line no-unused-vars
        classPath.listenEvent(SkillsEvents.SKILL_AFTER_CAST, async (skill, target, skillLogicResult) => {
            let customDataJson = sc.getJson(skill.customData);
            if(
                !customDataJson
                || !sc.getDef(customDataJson, 'blockMovement', false)
                || !sc.hasOwn(skill.owner, 'physicalBody')
            ){
                return;
            }
            skill.owner.physicalBody.isBlocked = false;
        }, 'skillAfterCastPack', ownerId);
        EventsManagerSingleton.emit('reldens.actionsPrepareEventsListeners', this, classPath);
    }

}

module.exports.ActionsPack = ActionsPack;
