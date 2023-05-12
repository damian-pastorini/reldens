/**
 *
 * Reldens - ChatMessageActions
 *
 */

const { ChatConst } = require('../../../chat/constants');
const { TeamsConst } = require('../../constants');
const { Logger, sc } = require('@reldens/utils');

class ChatMessageActions
{

    constructor(props)
    {
        this.events = sc.get(props, 'events', false);
        this.chatPlugin = sc.get(props, 'chatPlugin', false);
        this.client = false;
    }

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
        this.events.on('reldens.afterPlayerJoinedTeam', (props) => {
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
            this.sendMessage(
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
                this.sendMessage(messageEnter, 'Team', otherClients[i], player.player_id, player.state.room_id);
            }
        });
    }

    inviteTeamRejectedEventListener()
    {
        this.events.on('reldens.teamJoinInviteRejected', (props) => {
            let activePlayerSendingInvite = sc.get(props, 'activePlayerSendingInvite', false);
            let playerRejectingName = sc.get(props, 'playerRejectingName', false);
            if(!activePlayerSendingInvite || !playerRejectingName){
                return false;
            }
            let message = this.createMessage(TeamsConst.CHAT.MESSAGE.INVITE_REJECTED, playerRejectingName, 'team');
            this.sendMessage(
                message,
                'Team',
                activePlayerSendingInvite.client,
                activePlayerSendingInvite.playerData.id,
                activePlayerSendingInvite.playerData.state.room_id
            );
        });
    }

    teamMemberLeaveEventListener()
    {
        this.events.on('reldens.teamLeaveBeforeSendUpdate', (props) => {
            let currentTeam = sc.get(props, 'currentTeam', false);
            if(!currentTeam){
                return false;
            }
            let removingPlayerId = sc.get(props, 'playerId', false);
            if(!removingPlayerId){
                return false;
            }
            let leavingPlayerId = sc.get(props, 'singleRemoveId', false);
            if(!leavingPlayerId){
                return false;
            }
            let isOwnerDisbanding = sc.get(props, 'isOwnerDisbanding', false);
            let areLessPlayerThanRequired = sc.get(props, 'areLessPlayerThanRequired', false);
            if(isOwnerDisbanding){
                let room = sc.get(props, 'room', false);
                if(!room){
                    Logger.warning('Room undefined on "teamLeaveBeforeSendUpdate" event.');
                    return false;
                }
                let message = this.createMessage(
                    TeamsConst.CHAT.MESSAGE.DISBANDED,
                    currentTeam.owner.playerName,
                    'team'
                );
                let leavingPlayer = room.fetchActivePlayerById(removingPlayerId);
                if(!leavingPlayer){
                    Logger.warning('Leaving team player width ID "'+removingPlayerId+'" not found.');
                    return false;
                }
                this.sendMessage(
                    message,
                    'Team',
                    leavingPlayer.client,
                    removingPlayerId,
                    leavingPlayer.playerData.state.room_id
                );
                return true;
            }
            let room = sc.get(props, 'room', false);
            if(!room){
                Logger.warning('Undefined room on teamLeaveBeforeSendUpdate event.');
                return false;
            }
            let leavingPlayer = room.fetchActivePlayerById(leavingPlayerId);
            if(!leavingPlayer){
                Logger.info('Leaving team player with ID "'+leavingPlayerId+'" not found.');
                return false;
            }
            let message = this.createMessage(TeamsConst.CHAT.MESSAGE.LEFT, '', 'team');
            let otherClients = Object.assign({}, currentTeam.clients);
            delete otherClients[leavingPlayerId];
            for(let i of Object.keys(otherClients)){
                let player = currentTeam.players[i];
                this.sendMessage(message, 'Team', otherClients[i], player.player_id, player.state.room_id);
            }
            if(areLessPlayerThanRequired){
                let removingPlayer = currentTeam.players[removingPlayerId];
                this.sendMessage(
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

    inviteClanAcceptedEventListener()
    {
        this.events.on('reldens.afterPlayerJoinedClan', (props) => {
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
            this.sendMessage(message, 'Clan', clan.ownerClient, clan.owner.player_id, playerJoining.state.room_id);
        });
    }

    inviteClanRejectedEventListener()
    {
        this.events.on('reldens.clanJoinInviteRejected', (props) => {
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
            this.sendMessage(
                message,
                'Clan',
                clientSendingInvite,
                clanInvite.owner.player_id,
                clanInvite.players[clanInvite.owner.player_id].physicalBody.world.roomId
            );
        });
    }

    clanMemberLeavingEventListener()
    {
        this.events.on('reldens.clanLeaveBeforeSendUpdate', (props) => {
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
                this.sendMessage(
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
            this.sendMessage(message, 'Clan', leavingClient, leavingPlayer.player_id, leavingPlayer.state.room_id);
            return true;
        });
    }

    createMessage(baseChatMessage = '', playerName = '', groupName = '')
    {
        let message = baseChatMessage.replace('%playerName', playerName);
        // @TODO - BETA - Split class in multiple actions, remove the "groupName" since it will limit the translations.
        if(groupName){
            message = message.replace('%groupName', groupName);
        }
        return message;
    }

    sendMessage(message, chatFrom, client, playerId, roomId)
    {
        let messageObject = {
            act: ChatConst.CHAT_ACTION,
            [ChatConst.CHAT_FROM]: chatFrom,
            [ChatConst.CHAT_MESSAGE]: message,
            [ChatConst.CHAT_TO]: ChatConst.CHAT_TYPE_SYSTEM
        };
        if(!client){
            Logger.critical('Client undefined for message.', message, chatFrom, client);
            return false;
        }
        client.send('*', messageObject);
        if(!playerId){
            Logger.error('Undefined playerId for save chat message.', message);
            return false;
        }
        if(!roomId){
            Logger.error('Undefined roomId for save chat message.', message);
            return false;
        }
        this.chatPlugin.chatManager.saveMessage(message, playerId, roomId, ChatConst.CHAT_TEAMS).catch((err) => {
            Logger.error('Save team chat message error.', message, playerId, roomId, err);
        });
    }

}

module.exports.ChatMessageActions = ChatMessageActions;
