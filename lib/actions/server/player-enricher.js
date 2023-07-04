/**
 *
 * Reldens - PlayerEnricher
 *
 */

const { Pvp } = require('./pvp');
const { SkillsExtraData } = require('./skills/skills-extra-data');
const { ClientWrapper } = require('../../game/server/client-wrapper');
const SkillsServer = require('@reldens/skills/lib/server');
const { SkillConst } = require('@reldens/skills');
const { Logger, sc } = require('@reldens/utils');

class PlayerEnricher
{

    static async withClassPath(roomGame, superInitialGameData, dataServer)
    {
        if(!roomGame.config.get('client/players/multiplePlayers/enabled') || !superInitialGameData.players){
            return;
        }
        for(let i of Object.keys(superInitialGameData.players)){
            let player = superInitialGameData.players[i];
            let classPath = await dataServer.entityManager.get('ownersClassPath').loadOneByWithRelations(
                'owner_id',
                player.id,
                'owner_full_class_path'
            );
            if(!classPath){
                continue;
            }
            player.currentLevel = classPath.currentLevel;
            player.currentClassPathLabel = classPath.owner_full_class_path.label;
            player.currentClassPathKey = player.avatarKey = classPath.owner_full_class_path.key;
        }
    }

    static async withActions(currentPlayer, room, events)
    {
        currentPlayer.actions = {};
        let pvpConfig = Object.assign({events: events}, room.config.get('server/actions/pvp'));
        if(pvpConfig){
            currentPlayer.actions['pvp'] = new Pvp(pvpConfig);
        }
        currentPlayer.getSkillExtraData = (params) => {
            return SkillsExtraData.extractSkillExtraData(params);
        };
        currentPlayer.executePhysicalSkill = this.playerExecutePhysicalSkillCallback(currentPlayer, room);
    }

    static playerExecutePhysicalSkillCallback(currentPlayer, room)
    {
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
            let animData = sc.get(room.config.client.skills.animations, executedSkill.key + '_bullet', false);
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

    static async withSkillsServerAndClassPath(props)
    {
        let {client, currentPlayer, room, skillsModelsManager, dataServer, events} = props;
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
            affectedProperty: room.config.get('client/actions/skills/affectedProperty'),
            client: new ClientWrapper({client, room})
        });
        currentPlayer.skillsServer = new SkillsServer(classPathData);
        currentPlayer.avatarKey = classPathData.key;
    }

}

module.exports.PlayerEnricher = PlayerEnricher;
