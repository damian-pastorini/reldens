/**
 *
 * Reldens - ChatMessageActions
 *
 * Integrates team and clan events with the chat system.
 * Sends chat notifications for team/clan invitations, joins, rejections, leaves, and disbands.
 *
 */

const { MessageFactory } = require('../../../chat/message-factory');
const { ChatConst } = require('../../../chat/constants');
const { TeamsConst } = require('../../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('../../../chat/server/plugin').ChatPlugin} ChatPlugin
 */
class ChatMessageActions
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        /** @type {EventsManager|boolean} */
        this.events = sc.get(props, 'events', false);
        /** @type {ChatPlugin|boolean} */
        this.chatPlugin = sc.get(props, 'chatPlugin', false);
        /** @type {boolean} */
        this.client = false;
    }

    /**
     * @returns {boolean}
     */
    listenEvents()
    {
        if(!this.events){
            Logger.error('EventsManager undefined in Teams ChatMessageActions.');
            return false;
        }
        if(!this.chatPlugin){
            Logger.error('ChatPlugin undefined in Teams ChatMessageActions.');
            return false;
        }
        this.inviteTeamAcceptedEventListener();
        this.inviteTeamRejectedEventListener();
        this.teamMemberLeaveEventListener();
        this.inviteClanAcceptedEventListener();
        this.inviteClanRejectedEventListener();
        this.clanMemberLeavingEventListener();
    }

    inviteTeamAcceptedEventListener()
    {
        this.events.on('reldens.afterPlayerJoinedTeam', async (props) => {
            let playerJoining = sc.get(props, 'playerJoining', false);
            if(!playerJoining){
                Logger.warning('Missing event property "playerJoining".');
                return false;
            }
            let currentTeam = sc.get(props, 'currentTeam', false);
            if(!currentTeam){
                Logger.warning('Missing event property "currentTeam".');
                return false;
            }
            let message = this.createMessage(TeamsConst.CHAT.MESSAGE.INVITE_ACCEPTED, playerJoining.playerName, 'team');
            await this.sendMessage(
                message,
                'Team',
                currentTeam.ownerClient,
                playerJoining.player_id,
                playerJoining.state.room_id
            );
            let messageEnter = this.createMessage(TeamsConst.CHAT.MESSAGE.ENTER, playerJoining.playerName, 'team');
            let otherClients = Object.assign({}, currentTeam.clients);
            delete otherClients[playerJoining.player_id];
            delete otherClients[currentTeam.owner.player_id];
            for(let i of Object.keys(otherClients)){
                let player = currentTeam.players[i];
                await this.sendMessage(messageEnter, 'Team', otherClients[i], player.player_id, player.state.room_id);
            }
        });
    }

    inviteTeamRejectedEventListener()
    {
        this.events.on('reldens.teamJoinInviteRejected', async (props) => {
            let playerSendingInvite = sc.get(props, 'playerSendingInvite', false);
            let playerRejectingName = sc.get(props, 'playerRejectingName', false);
            if(!playerSendingInvite || !playerRejectingName){
                return false;
            }
            let message = this.createMessage(TeamsConst.CHAT.MESSAGE.INVITE_REJECTED, playerRejectingName, 'team');
            await this.sendMessage(
                message,
                'Team',
                playerSendingInvite.client,
                playerSendingInvite.playerId,
                playerSendingInvite.roomId
            );
        });
    }

    teamMemberLeaveEventListener()
    {
        this.events.on('reldens.teamLeaveBeforeSendUpdate', async (props) => {
            let currentTeam = sc.get(props, 'currentTeam', false);
            if(!currentTeam){
                return false;
            }
            let removingPlayerId = sc.get(props, 'playerId', false);
            if(!removingPlayerId){
                return false;
            }
            let removingPlayer = currentTeam.players[removingPlayerId];
            let room = sc.get(props, 'room', false);
            if(!room){
                Logger.warning('Room undefined on "teamLeaveBeforeSendUpdate" event.');
                return false;
            }
            let isOwnerDisbanding = sc.get(props, 'isOwnerDisbanding', false);
            if(isOwnerDisbanding){
                return await this.ownerDisbandTeam(removingPlayer, currentTeam, room);
            }
            let leavingPlayerId = sc.get(props, 'singleRemoveId', false);
            if(!leavingPlayerId){
                return false;
            }
            let message = this.createMessage(TeamsConst.CHAT.MESSAGE.LEFT, '', 'team');
            let otherClients = Object.assign({}, currentTeam.clients);
            delete otherClients[leavingPlayerId];
            for(let i of Object.keys(otherClients)){
                let player = currentTeam.players[i];
                await this.sendMessage(message, 'Team', otherClients[i], player.player_id, player.state.room_id);
            }
            let areLessPlayerThanRequired = sc.get(props, 'areLessPlayerThanRequired', false);
            if(areLessPlayerThanRequired){
                await this.sendMessage(
                    TeamsConst.CHAT.MESSAGE.NOT_ENOUGH_PLAYERS,
                    'Team',
                    currentTeam.clients[removingPlayerId],
                    removingPlayer.player_id,
                    removingPlayer.state.room_id,
                );
            }
            return true;
        });
    }

    /**
     * @param {Object} ownerPlayer
     * @param {Object} currentTeam
     * @param {Object} room
     * @returns {Promise<boolean>}
     */
    async ownerDisbandTeam(ownerPlayer, currentTeam, room)
    {
        let message = this.createMessage(TeamsConst.CHAT.MESSAGE.DISBANDED, currentTeam.owner.playerName, 'team');
        let leavingPlayer = room.activePlayerByPlayerId(ownerPlayer.player_id, room.roomId);
        if(!leavingPlayer){
            Logger.warning('Leaving team player width ID "'+ownerPlayer.player_id+'" not found.');
            return false;
        }
        await this.sendMessage(message, 'Team', leavingPlayer.client, ownerPlayer.player_id, ownerPlayer.state.room_id);
        return true;
    }

    inviteClanAcceptedEventListener()
    {
        this.events.on('reldens.afterPlayerJoinedClan', async (props) => {
            let playerJoining = sc.get(props, 'playerJoining', false);
            if(!playerJoining){
                return false;
            }
            let clan = sc.get(props, 'clan', false);
            if(!clan){
                return false;
            }
            let playerJoiningName = playerJoining.playerName;
            let message = this.createMessage(
                TeamsConst.CHAT.MESSAGE.INVITE_ACCEPTED,
                playerJoiningName
            );
            await this.sendMessage(message, 'Clan', clan.ownerClient, clan.owner.player_id, playerJoining.state.room_id);
        });
    }

    inviteClanRejectedEventListener()
    {
        this.events.on('reldens.clanJoinInviteRejected', async (props) => {
            let clientSendingInvite = sc.get(props, 'clientSendingInvite', false);
            let playerRejectingName = sc.get(props, 'playerRejectingName', false);
            let clanInvite = sc.get(props, 'clanInvite', false);
            if(!clientSendingInvite || !playerRejectingName){
                return false;
            }
            let message = this.createMessage(
                TeamsConst.CHAT.MESSAGE.INVITE_REJECTED,
                playerRejectingName
            );
            await this.sendMessage(
                message,
                'Clan',
                clientSendingInvite,
                clanInvite.owner.player_id,
                clanInvite.players[clanInvite.owner.player_id].state.room_id
            );
        });
    }

    clanMemberLeavingEventListener()
    {
        this.events.on('reldens.clanLeaveBeforeSendUpdate', async (props) => {
            let playerLeavingId = sc.get(props, 'playerId', false);
            if(!playerLeavingId){
                Logger.error('Leaving player ID undefined on "clanLeaveBeforeSendUpdate" event.');
                return false;
            }
            let currentClan = sc.get(props, 'currentClan', false);
            if(!currentClan){
                Logger.error('Clan undefined on "clanLeaveBeforeSendUpdate" event.');
                return false;
            }
            let disbandClan = sc.get(props, 'disbandClan', false);
            let leavingPlayer = currentClan.players[playerLeavingId];
            let leavingClient = currentClan.clients[playerLeavingId];
            if(disbandClan){
                let message = this.createMessage(
                    TeamsConst.CHAT.MESSAGE.DISBANDED,
                    leavingPlayer.playerName,
                    'clan'
                );
                await this.sendMessage(
                    message,
                    'Clan',
                    leavingClient,
                    leavingPlayer.player_id,
                    leavingPlayer.state.room_id
                );
                return true;
            }
            let message = this.createMessage(
                props.singleRemoveId ? TeamsConst.CHAT.MESSAGE.REMOVED : TeamsConst.CHAT.MESSAGE.LEAVE,
                leavingPlayer.playerName,
                'clan'
            );
            await this.sendMessage(message, 'Clan', leavingClient, leavingPlayer.player_id, leavingPlayer.state.room_id);
            return true;
        });
    }

    /**
     * @param {string} baseChatMessage
     * @param {string} playerName
     * @param {string} groupName
     * @returns {string}
     */
    createMessage(baseChatMessage = '', playerName = '', groupName = '')
    {
        let message = baseChatMessage.replace('%playerName', playerName);
        // @TODO - BETA - Split class in multiple actions, remove the "groupName" since it will limit the translations.
        if(groupName){
            message = message.replace('%groupName', groupName);
        }
        return message;
    }

    /**
     * @param {string} message
     * @param {string} chatFrom
     * @param {Object} client
     * @param {number|string} playerId
     * @param {number|string} roomId
     * @returns {Promise<boolean>}
     */
    async sendMessage(message, chatFrom, client, playerId, roomId)
    {
        if(!client){
            Logger.critical('Client undefined for message.', message, chatFrom, client);
            return false;
        }
        let messageObject = MessageFactory.create(
            ChatConst.TYPES.TEAMS,
            message,
            {},
            chatFrom
        );
        client.send('*', messageObject);
        if(!playerId){
            Logger.error('Undefined playerId for save chat message.', message);
            return false;
        }
        if(!roomId){
            Logger.error('Undefined roomId for save chat message.', message);
            return false;
        }
        let saveResult = await this.chatPlugin.chatManager.saveMessage(
            message,
            playerId,
            roomId,
            false,
            ChatConst.TYPES.TEAMS
        );
        if(!saveResult){
            Logger.error('Save team chat message error.', messageObject, playerId, roomId);
        }
    }

}

module.exports.ChatMessageActions = ChatMessageActions;
