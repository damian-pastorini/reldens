/**
 *
 * Reldens - Chat Server Package
 *
 */

const { RoomChat } = require('./room-chat');
const { ChatMessageActions } = require('./message-actions');
const { ChatManager } = require('./manager');
const { ChatConst } = require('../constants');
const { PackInterface } = require('../../features/pack-interface');
const { Logger, sc } = require('@reldens/utils');
const { SkillsEvents } = require('@reldens/skills');

class ChatPack extends PackInterface
{

    setupPack(props)
    {
        this.events = sc.getDef(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in ChatPack.');
        }
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
            roomMessageActions.chat = ChatMessageActions;
        });
        // eslint-disable-next-line no-unused-vars
        this.events.on('reldens.actionsPrepareEventsListeners', async (actionsPack, classPath) => {
            if(!this.chatConfig.damageMessages){
                return;
            }
            // eslint-disable-next-line no-unused-vars
            classPath.listenEvent(SkillsEvents.SKILL_ATTACK_APPLY_DAMAGE, (skill, target, damage, newValue) => {
                let client = skill.owner.skillsServer.client.client;
                let sendMessage = damage+' hit';
                let messageObject = {
                    act: ChatConst.CHAT_ACTION,
                    f: skill.owner.playerName,
                    m: sendMessage
                };
                client.send(messageObject);
                ChatManager.saveMessage(
                    sendMessage, skill.owner.player_id, skill.owner.state.room_id, false, ChatConst.CHAT_JOINED
                ).catch((err) => {
                    Logger.error(['Joined room chat save error:', err]);
                });
            }, 'skillAttackApplyDamageChat', classPath.owner[classPath.ownerIdProperty]);
        });
    }

}

module.exports.ChatPack = ChatPack;
