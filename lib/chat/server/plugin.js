/**
 *
 * Reldens - ChatPlugin
 *
 * Initializes and manages the chat system on the server side including rooms and event listeners.
 *
 */

const { RoomChat } = require('./room-chat');
const { ChatMessageActions } = require('./message-actions');
const { ChatManager } = require('./manager');
const { PlayerSkills } = require('./event-listener/player-skills');
const { NpcSkills } = require('./event-listener/npc-skills');
const { GuestInvalidChangePoint } = require('./event-listener/guest-invalid-change-point');
const { PrivateMessageCrossServerRelay } = require('./private-message-cross-server-relay');
const { PluginInterface } = require('../../features/plugin-interface');
const { ChatConst } = require('../constants');
const { UsersConst } = require('../../users/constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManagerSingleton} EventsManagerSingleton
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 * @typedef {import('../../game/server/server-to-server-messenger-props').ServerToServerMessengerProps
 * } ServerToServerMessengerProps
 */
class ChatPlugin extends PluginInterface
{

    constructor()
    {
        super();
        /** @type {Object|boolean} */
        this.config = false;
        /** @type {PrivateMessageCrossServerRelay|boolean} */
        this.privateMessageRelay = false;
        /** @type {ServerToServerMessengerProps|boolean} */
        this.serverToServerMessengerProps = false;
    }

    /**
     * @param {Object} props
     * @param {EventsManagerSingleton} [props.events]
     * @param {BaseDataServer} [props.dataServer]
     */
    async setup(props)
    {
        /** @type {EventsManagerSingleton|boolean} */
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in ChatPlugin.');
        }
        /** @type {BaseDataServer|boolean} */
        this.dataServer = sc.get(props, 'dataServer', false);
        if(!this.dataServer){
            Logger.error('DataServer undefined in ChatPlugin.');
        }
        /** @type {Object|boolean} */
        this.chatConfig = false;
        /** @type {ChatManager} */
        this.chatManager = new ChatManager({dataServer: this.dataServer});
        /** @type {Array<string>} */
        this.rooms = ['chat'];
        /** @type {GuestInvalidChangePoint} */
        this.guestEventsListener = new GuestInvalidChangePoint();
        this.config = sc.get(props, 'config', false);
        this.serverToServerMessengerProps = sc.get(props, 'serverToServerMessengerProps', false);
        this.listenEvents();
    }

    /**
     * @returns {boolean}
     */
    listenEvents()
    {
        if(!this.events){
            return false;
        }
        if(!this.config || !this.serverToServerMessengerProps){
            Logger.error('Missing config or servers messenger props in ChatPlugin.');
            return false;
        }
        this.privateMessageRelay = new PrivateMessageCrossServerRelay(Object.assign(
            {
                characterLimit: this.config.get('client/chat/messages/characterLimit'),
                maximumPlayerNameLength: this.config.getWithoutLogs(
                    'client/players/name/maximumLength',
                    UsersConst.PLAYER_NAME_MAXIMUM_LENGTH
                ),
                routePath: ChatConst.SYNC.ROUTE
            },
            this.serverToServerMessengerProps
        ));
        this.events.on('reldens.beforeSuperInitialGameData', async (superInitialGameData) => {
            superInitialGameData.chatTypes = await this.dataServer.getEntity('chatMessageTypes').loadAll();
        });
        this.events.on('reldens.serverBeforeListen', (event) => {
            this.privateMessageRelay.registerRoute(event.serverManager);
        });
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
            PlayerSkills.listenEvents(classPath, this.chatConfig, this.chatManager);
        });
        this.events.on('reldens.setupActions', async (props) => {
            NpcSkills.listenEvents(props, this.chatConfig, this.chatManager);
        });
        this.events.on('reldens.guestInvalidChangePoint', async (event) => {
            await this.guestEventsListener.sendMessage(event, this.chatManager);
        });
    }
}

module.exports.ChatPlugin = ChatPlugin;
