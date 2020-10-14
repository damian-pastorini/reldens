/**
 *
 * Reldens - Actions Server Package
 *
 */

const { SkillConst, SkillsServer } = require('@reldens/skills');
const { ModelsManager } = require('@reldens/skills/lib/server/storage/models-manager');
const { EventsManagerSingleton, sc } = require('@reldens/utils');
const { ActionsMessageActions } = require('./message-actions');
const { ClientWrapper } = require('./client-wrapper');
const { PackInterface } = require('../../features/server/pack-interface');
const { Pvp } = require('./pvp');
const { TypeAttack, TypeEffect, TypePhysicalAttack, TypePhysicalEffect } = require('./skills/types');

class ActionsPack extends PackInterface
{

    setupPack()
    {
        this.skillsModelsManager = new ModelsManager({events: EventsManagerSingleton});
        EventsManagerSingleton.on('reldens.serverReady', async (event) => {
            await this.onServerReady(event);
        });
        // eslint-disable-next-line no-unused-vars
        EventsManagerSingleton.on('reldens.roomsMessageActionsByRoom', async (roomMessageActions, roomName) => {
            roomMessageActions.actions = ActionsMessageActions;
        });
        EventsManagerSingleton.on('reldens.createPlayerAfter', async (client, authResult, currentPlayer, room) => {
            await this.onCreatePlayerAfter(client, authResult, currentPlayer, room);
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
    }

    async onCreatePlayerAfter(client, authResult, currentPlayer, room)
    {
        this.appendActionsToPlayer(currentPlayer, room);
        // player created, setting broadcastKey:
        currentPlayer.broadcastKey = currentPlayer.sessionId;
        // prepare player classPath and skills data:
        let classPathData = await this.skillsModelsManager.prepareClassPathData(
            currentPlayer,
            'player_id',
            room.config.skills.classPaths.classPathsById,
            room.config.skills.skillsList
        );
        if(classPathData){
            classPathData.client = new ClientWrapper(client, room);
            currentPlayer.skillsServer = new SkillsServer(classPathData);
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
        currentPlayer.executePhysicalSkill = (target, bulletObject) => {
            let from = {x: currentPlayer.state.x, y: currentPlayer.state.y};
            let to = {x: target.state.x, y: target.state.y};
            let bulletBody = currentPlayer.physicalBody.world.shootBullet(from, to, bulletObject);
            bulletBody.onHit = (onHitData) => {
                bulletObject.onHit(onHitData);
            };
            return false;
        };
    }

}

module.exports.ActionsPack = ActionsPack;
