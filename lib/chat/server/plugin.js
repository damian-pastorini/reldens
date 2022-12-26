/**
 *
 * Reldens - ChatPlugin.
 *
 */

const { RoomChat } = require('./room-chat');
const { ChatMessageActions } = require('./message-actions');
const { ChatManager } = require('./manager');
const { PluginInterface } = require('../../features/plugin-interface');
const { Logger, sc } = require('@reldens/utils');
const { PlayerSkillDamage } = require('./event-listener/player-skill-damage');
const { NpcSkillDamage } = require('./event-listener/npc-skill-damage');

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
            PlayerSkillDamage.listenEvent(classPath, this.chatConfig, this.chatManager);
        });
        this.events.on('reldens.setupActions', async (props) => {
            NpcSkillDamage.listenEvent(props, this.chatConfig, this.chatManager);
        });
    }

}

module.exports.ChatPlugin = ChatPlugin;
