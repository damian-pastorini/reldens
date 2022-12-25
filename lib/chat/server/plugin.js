/**
 *
 * Reldens - Chat Server Plugin.
 *
 */

const { RoomChat } = require('./room-chat');
const { ChatMessageActions } = require('./message-actions');
const { ChatManager } = require('./manager');
const { ChatConst } = require('../constants');
const { PluginInterface } = require('../../features/plugin-interface');
const { SkillsEvents, SkillConst } = require('@reldens/skills');
const { Logger, sc } = require('@reldens/utils');

class ChatPlugin extends PluginInterface
{

    setup(props)
    {
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in ChatPlugin.');
        }
        this.dataServer = sc.get(props, 'dataServer', false);
        if(!this.dataServer){
            Logger.error('DataServer undefined in ChatPlugin.');
        }
        this.chatManager = new ChatManager({dataServer: this.dataServer});
        // rooms is the list of the current feature rooms names that later will be sent to the client and used to join.
        this.rooms = ['chat'];
        // then we can use the event manager to append the feature in every action required:
        this.events.on('reldens.roomsDefinition', (roomsList) => {
            // here we are adding the chat room to be defined in the game server:
            roomsList.push({roomName: 'chat', room: RoomChat});
        });
        this.events.on('reldens.serverConfigFeaturesReady', (props) => {
            this.chatConfig = props.configProcessor.get('client/ui/chat');
        });
        // when the client sent a message to any room it will be checked by all the global messages defined:
        this.events.on('reldens.roomsMessageActionsGlobal', (roomMessageActions) => {
            roomMessageActions.chat = new ChatMessageActions({dataServer: this.dataServer});
        });
        this.events.on('reldens.actionsPrepareEventsListeners', async (actionsPack, classPath) => {
            if(!this.chatConfig.damageMessages){
                return;
            }
            classPath.listenEvent(
                SkillsEvents.SKILL_ATTACK_APPLY_DAMAGE,
                this.sendDamageMessageCallback(classPath.owner.skillsServer.client.client),
                'skillAttackApplyDamageChat',
                classPath.owner[classPath.ownerIdProperty]
            );
        });
        this.events.on('reldens.setupActions', (props) => {
            if(!this.chatConfig.damageMessages){
                return;
            }
            let attackSkills = this.fetchAttackSkill(props);
            if(0 < attackSkills.length){
                let skill = attackSkills.shift();
                skill.listenEvent(
                    SkillsEvents.SKILL_ATTACK_APPLY_DAMAGE,
                    this.sendDamageMessageCallback(null),
                    'skillAttackApplyDamageChat',
                    skill.owner[skill.ownerIdProperty]
                );
            }
        });
    }

    fetchAttackSkill(props)
    {
        let skillInstancesList = props.enemyObject?.actions || {};
        let keys = Object.keys(skillInstancesList);
        if(0 === keys.length){
            return [];
        }
        for(let i of keys){
            let skill = skillInstancesList[i];
            if(SkillConst.SKILL_TYPE_ATTACK !== skill.type && SkillConst.SKILL_TYPE_PHYSICAL_ATTACK !== skill.type){
                continue;
            }
            return skill;
        }
        return false;
    }

    fetchAttackSkills(props)
    {
        let skillInstancesList = props.enemyObject?.actions || {};
        let keys = Object.keys(skillInstancesList);
        if(0 === keys.length){
            return [];
        }
        let attackSkills = [];
        for(let i of keys){
            let skill = skillInstancesList[i];
            if(SkillConst.SKILL_TYPE_ATTACK !== skill.type && SkillConst.SKILL_TYPE_PHYSICAL_ATTACK !== skill.type){
                continue;
            }
            attackSkills.push(skill);
        }
        return attackSkills;
    }

    sendDamageMessageCallback(client)
    {
        return (skill, target, damage) => {
            let isPlayerSkillOwner = sc.hasOwn(skill.owner, 'playerName');
            if(null === client && isPlayerSkillOwner){
                return false;
            }
            if(!client){
                client = target?.skillsServer?.client?.client ?? null;
            }
            if(null === client){
                return false;
            }
            let isObjectTarget = sc.hasOwn(target, 'key');
            let sendMessage = damage + ' hit on ' + (isObjectTarget ? target.title : target.playerName);
            let messageObject = {
                act: ChatConst.CHAT_ACTION,
                f: isPlayerSkillOwner ? skill.owner.playerName : skill.owner.title,
                m: sendMessage,
                t: ChatConst.CHAT_TYPE_SYSTEM_BATTLE
            };
            client.send(messageObject);
            let roomId = isPlayerSkillOwner ? skill.owner.state.room_id : target.state.room_id;
            let playerId = isPlayerSkillOwner ? skill.owner.player_id : target.player_id;
            this.chatManager.saveMessage(
                sendMessage,
                playerId,
                roomId,
                false,
                ChatConst.CHAT_DAMAGE
            ).catch((err) => {
                Logger.error(['Joined room chat save error:', err]);
            });
        };
    }
}

module.exports.ChatPlugin = ChatPlugin;
