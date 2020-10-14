/**
 *
 * Reldens - Actions Server Package
 *
 */

const { ActionsMessageActions } = require('./message-actions');
const { ModelsManager } = require('@reldens/skills/lib/server/storage/models-manager');
const { EventsManager, ErrorManager, Logger, sc } = require('@reldens/utils');
const { PackInterface } = require('../../features/server/pack-interface');
const { GameConst } = require('../../game/constants');
const { ObjectsConst } = require('../../objects/constants');
const { Pvp } = require('./pvp');
const { TypeAttack, TypeEffect, TypePhysicalAttack, TypePhysicalEffect } = require('./skills/types');
const { SkillConst, ClassPath, Level, SkillsServer, SkillsEvents } = require('@reldens/skills');
const { Modifier } = require('@reldens/modifiers');

class ActionsPack extends PackInterface
{

    setupPack()
    {
        // @TODO: refactor pack to extract the models and classes generation to the external packages.
        this.skillsModelsManager = new ModelsManager();
        EventsManager.on('reldens.serverReady', async (event) => {
            let configProcessor = event.serverManager.configManager.processor;
            if(!sc.hasOwn(configProcessor, 'skills')){
                configProcessor['skills'] = {skillsList: {}};
            }
            if(!sc.hasOwn(configProcessor.skills, 'defaultSkills')){
                configProcessor.skills['defaultSkills'] = {};
            }
            configProcessor['skills']['defaultSkills'][SkillConst.SKILL_TYPE_ATTACK] = TypeAttack;
            configProcessor['skills']['defaultSkills'][SkillConst.SKILL_TYPE_EFFECT] = TypeEffect;
            configProcessor['skills']['defaultSkills'][SkillConst.SKILL_TYPE_PHYSICAL_ATTACK] = TypePhysicalAttack;
            configProcessor['skills']['defaultSkills'][SkillConst.SKILL_TYPE_PHYSICAL_EFFECT] = TypePhysicalEffect;
            await this.loadSkillsFullList(configProcessor);
            await this.loadGroupsFullList(configProcessor);
            await this.loadClassPathFullList(configProcessor);
        });
        // eslint-disable-next-line no-unused-vars
        EventsManager.on('reldens.roomsMessageActionsByRoom', async (roomMessageActions, roomName) => {
            roomMessageActions.actions = ActionsMessageActions;
        });
        EventsManager.on('reldens.createPlayerAfter', async (client, authResult, currentPlayer, room) => {
            currentPlayer.actions = {};
            let pvpConfig = room.config.get('server/actions/pvp');
            currentPlayer.actions['pvp'] = new Pvp(pvpConfig);
            currentPlayer.executePhysicalSkill = (target, bulletObject) => {
                let from = {x: currentPlayer.state.x, y: currentPlayer.state.y};
                let to = {x: target.state.x, y: target.state.y};
                let bulletBody = currentPlayer.physicalBody.world.shootBullet(from, to, bulletObject);
                bulletBody.onHit = (onHitData) => {
                    bulletObject.onHit(onHitData);
                };
                return false;
            };
            // player created, setting broadcastKey:
            currentPlayer.broadcastKey = currentPlayer.sessionId;
            // get player classPath and skills list:
            let loadedPlayerClassPath = await this.skillsModelsManager.loadOwnerClassPath(currentPlayer.player_id);
            if(!loadedPlayerClassPath.length){
                Logger.error(['Undefined class path for player.', 'ID:', currentPlayer.player_id]);
                return false;
            }
            // @TODO: temp index 0, one class path per player (we will have optional multiple classes in the future).
            let currentPlayerClassPath = loadedPlayerClassPath[0];
            let classPathData = await this.prepareClassPathData(currentPlayerClassPath, currentPlayer, room.config);
            // force to use the same events manager instance used on the main package:
            classPathData.events = EventsManager;
            let clientWrapper = {
                send: (data) => {
                    room.send(client, data);
                },
                broadcast: (data) => {
                    room.broadcast(data);
                }
            };
            classPathData.client = clientWrapper;
            classPathData.persistence = true;
            currentPlayer.skillsServer = new SkillsServer(classPathData);
        });
        EventsManager.on('reldens.onMessageRunAction', async (message, playerSchema, target, room) => {
            if(message.target.type === GameConst.TYPE_PLAYER){
                await playerSchema.actions['pvp'].runBattle(playerSchema, target, room);
            }
            if(message.target.type === ObjectsConst.TYPE_OBJECT && sc.hasOwn(target, 'battle')){
                await target.battle.runBattle(playerSchema, target, room);
            }
        });
        // eslint-disable-next-line no-unused-vars
        EventsManager.on(SkillsEvents.LEVEL_EXPERIENCE_ADDED, (levelSet, number) => {
            console.log('WON EXP!', number, ' > TOTAL:', levelSet.currentExp);
        });
        // eslint-disable-next-line no-unused-vars
        EventsManager.on(SkillsEvents.LEVEL_UP, (levelSet, number) => {
            console.log('LEVEL UP!!', levelSet.currentLevel);
        });
    }

    async loadSkillsFullList(configProcessor)
    {
        let skillsModels = await this.skillsModelsManager.models.skill.loadAll();
        if(skillsModels.length){
            let skillsList = {};
            // see theme/packages/server.js:
            let skillsClasses = configProcessor.get('server/customClasses/skills/skillsList');
            // defined in this same class on the reldens.serverReady listener:
            let defaultSkills = configProcessor.skills.defaultSkills;
            for(let skillModel of skillsModels){
                let skillClass = sc.hasOwn(skillsClasses, skillModel.type) ? skillsClasses[skillModel.type]
                    : sc.hasOwn(defaultSkills, skillModel.type) ? defaultSkills[skillModel.type] : false;
                if(!skillClass){
                    ErrorManager.error('Undefined skill type in skillsList:' + skillModel.type);
                }
                // force to use the same events manager instance used on the main package:
                skillModel.events = EventsManager;
                skillsList[skillModel.key] = {class: skillClass, data: skillModel};
            }
            configProcessor.skills = {skillsModels, skillsList};
        }
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
        let classPathModels = await this.skillsModelsManager.models.classPath.fullPathData();
        if(classPathModels.length){
            let classPathsById = {};
            let classPathsByKey = {};
            let classPathClasses = configProcessor.get('server/customClasses/skills/classPath');
            for(let classPathModel of classPathModels){
                let classPathClass = ClassPath;
                if(sc.hasOwn(classPathClasses, classPathModel.key)){
                    classPathClass = classPathClasses[classPathModel.key];
                }
                let classPathData = {class: classPathClass, data: classPathModel};
                classPathModel.classPathLevels = this.getClassPathLevels(
                    classPathModel.skills_levels_set.skills_levels_set_levels
                );
                classPathModel.labelsByLevel = this.parseLabelsByLevels(classPathModel.skills_class_path_level_labels);
                classPathsById[classPathModel.id] = classPathData;
                classPathsByKey[classPathModel.key] = classPathData;
            }
            configProcessor.skills.classPaths = {classPathModels: classPathModels, classPathsById, classPathsByKey};
        }
    }

    async prepareClassPathData(currentPlayerClassPath, currentPlayer, config)
    {
        let classPathsById = config.skills.classPaths.classPathsById[currentPlayerClassPath.id];
        let skillsByLevel = this.parseSkillsByLevels(
            classPathsById.data.skills_class_path_level_skills,
            currentPlayer,
            config
        );
        return {
            key: classPathsById.data.key,
            label: classPathsById.data.label,
            owner: currentPlayer,
            ownerIdProperty: 'player_id',
            levels: classPathsById.data.classPathLevels,
            labelsByLevel: classPathsById.data.labelsByLevel,
            skillsByLevel,
            autoFillRanges: classPathsById.data.skills_levels_set.autoFillRanges,
            autoSortLevels: classPathsById.data.skills_levels_set.autoSortLevels,
            currentLevel: currentPlayerClassPath.currentLevel,
            currentExp: currentPlayerClassPath.currentExp
        };
    }

    parseSkillsByLevels(levelSkillsModel, currentPlayer, config)
    {
        let skillsByLevel = {};
        for(let skillData of levelSkillsModel){
            let levelKey = parseInt(skillData['level_key']);
            if(!sc.hasOwn(skillsByLevel, skillData['level_key'])){
                skillsByLevel[levelKey] = {};
            }
            let skillModel = skillData.class_path_level_skill;
            skillModel.owner = currentPlayer;
            if(sc.hasOwn(skillModel, 'skill_attack') && skillModel['skill_attack']){
                skillModel['attackProperties'] = skillModel['skill_attack'].attackProperties.split(',');
                skillModel['defenseProperties'] = skillModel['skill_attack'].defenseProperties.split(',');
                skillModel['aimProperties'] = skillModel['skill_attack'].aimProperties.split(',');
                skillModel['dodgeProperties'] = skillModel['skill_attack'].dodgeProperties.split(',');
                let attackProps = [
                    'affectedProperty',
                    'allowEffectBelowZero',
                    'hitDamage',
                    'applyDirectDamage',
                    'dodgeFullEnabled',
                    'dodgeOverAimSuccess',
                    'damageAffected',
                    'criticalAffected'
                ];
                for(let i of attackProps){
                    skillModel[i] = skillModel['skill_attack'][i];
                }
            }
            if(sc.hasOwn(skillModel, 'skill_physical_data') && skillModel['skill_physical_data']){
                let physicalProps = [
                    'magnitude',
                    'objectWidth',
                    'objectHeight',
                    'validateTargetOnHit'
                ];
                for(let i of physicalProps){
                    skillModel[i] = skillModel['skill_physical_data'][i];
                }
            }
            skillsByLevel[levelKey][skillModel.key] = new config.skills.skillsList[skillModel.key]['class'](skillModel);
        }
        return skillsByLevel;
    }

    parseLabelsByLevels(levelLabelsModel)
    {
        let labelsByLevel = {};
        for(let labelData of levelLabelsModel){
            labelsByLevel[labelData['level_key']] = labelData.label;
        }
        return labelsByLevel;
    }

    getClassPathLevels(levelsModels)
    {
        let levels = {};
        for(let levelData of levelsModels){
            let levelModifiers = [];
            if(levelData['level_modifiers'].length){
                for(let modifierData of levelData['level_modifiers']){
                    let modifier = new Modifier(modifierData);
                    levelModifiers.push(modifier);
                }
            }
            levelData.modifiers = levelModifiers;
            let levelKey = parseInt(levelData['key']);
            levelData.key = levelKey;
            levels[levelKey] = new Level(levelData);
        }
        return levels;
    }


}

module.exports.ActionsPack = ActionsPack;
