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
            Logger.error('EventsManager undefined in Teams ChatMessageActions');
            return false;
        }
        if(!this.chatPlugin){
            Logger.error('ChatPlugin undefined in Teams ChatMessageActions');
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
                return false;
            }
            let currentTeam = sc.get(props, 'currentTeam', false);
            if(!currentTeam){
                return false;
            }
            let message = this.createMessage(
                TeamsConst.CHAT.MESSAGE.INVITE_ACCEPTED,
                playerJoining.playerName
            );
            this.sendMessage(message, 'Team', currentTeam.ownerClient);
            let messageEnter = this.createMessage(TeamsConst.CHAT.MESSAGE.ENTER, playerJoining.playerName, 'team');
            let otherPlayers = this.gatherOtherPlayersOnTeam(currentTeam, [
                playerJoining.player_id,
                currentTeam.owner.player_id
            ]);
            for (let otherPlayer of otherPlayers){
                this.sendMessage(messageEnter, 'Team', otherPlayer.client);
            }
        });
    }

    inviteTeamRejectedEventListener()
    {
        this.events.on('reldens.teamJoinInviteRejected', (props) => {
            let clientSendingInvite = sc.get(props, 'clientSendingInvite', false);
            let playerRejectingName = sc.get(props, 'playerRejectingName', false);
            if(!clientSendingInvite || !playerRejectingName){
                return false;
            }
            let message = this.createMessage(
                TeamsConst.CHAT.MESSAGE.INVITE_REJECTED,
                playerRejectingName
            );
            this.sendMessage(message, 'Team', clientSendingInvite);
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
                let message = this.createMessage(
                    TeamsConst.CHAT.MESSAGE.DISBANDED,
                    currentTeam.owner.playerName,
                    'team'
                );
                this.sendMessage(message, 'Team', currentTeam[removingPlayerId].client);
                return true;
            }
            let playerInTeam = currentTeam.players[leavingPlayerId];
            if(!playerInTeam){
                Logger.warning('Player not found in team.', leavingPlayerId, currentTeam.players);
                return false;
            }
            let leavingPlayerName = playerInTeam.playerName;
            let message = this.createMessage(
                TeamsConst.CHAT.MESSAGE.LEAVE,
                leavingPlayerName,
                'team'
            );
            let otherPlayers = this.gatherOtherPlayersOnTeam(currentTeam, [leavingPlayerId]);
            for (let otherPlayer of otherPlayers){
                this.sendMessage(message, 'Team', otherPlayer.client);
            }
            if(areLessPlayerThanRequired){
                this.sendMessage(
                    TeamsConst.CHAT.MESSAGE.NOT_ENOUGH_PLAYERS,
                    'Team',
                    currentTeam.clients[removingPlayerId]
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
            this.sendMessage(message, 'Clan', clan.ownerClient);
        });
    }

    inviteClanRejectedEventListener()
    {
        this.events.on('reldens.clanJoinInviteRejected', (props) => {
            let clientSendingInvite = sc.get(props, 'clientSendingInvite', false);
            let playerRejectingName = sc.get(props, 'playerRejectingName', false);
            if(!clientSendingInvite || !playerRejectingName){
                return false;
            }
            let message = this.createMessage(
                TeamsConst.CHAT.MESSAGE.INVITE_REJECTED,
                playerRejectingName
            );
            this.sendMessage(message, 'Clan', clientSendingInvite);
        });
    }

    clanMemberLeavingEventListener()
    {
        this.events.on('reldens.clanLeaveBeforeSendUpdate', (props) => {
            let playerLeavingId = sc.get(props, 'playerId', false);
            if(!playerLeavingId){
                Logger.error('playerLeavingId undefined on ChatMessageAction');
                return false;
            }
            let currentClan = sc.get(props, 'currentClan', false);
            if(!currentClan){
                Logger.error('currentClan undefined on ChatMessageAction');
                return false;
            }
            let disbandClan = sc.get(props, 'disbandClan', false);

            if(disbandClan && playerLeavingId !== currentClan.owner.id){
                this.clanDisbanding(currentClan.owner.playerName, currentClan.clients[playerLeavingId]);
                return true;
            }
            let message = this.createMessage(
                TeamsConst.CHAT.MESSAGE.LEAVE,
                currentClan.players[playerLeavingId].playerName,
                'clan'
            );
            this.sendMessage(message, 'Clan', currentClan.ownerClient);
        });
    }

    clanDisbanding(clanOwnerName, clientLeaving)
    {
        let message = this.createMessage(
            TeamsConst.CHAT.MESSAGE.DISBANDED,
            clanOwnerName,
            'clan'
        );
        this.sendMessage(message, 'Clan', clientLeaving);
    }

    createMessage(baseChatMessage = '', playerName = '', groupName = '')
    {
        let message = baseChatMessage.replace('%playerName', playerName);
        if(groupName){
            message = message.replace('%groupName', groupName);
        }
        return message;
    }

    sendMessage(message, chatFrom, client)
    {
        let messageObject = {
            act: ChatConst.CHAT_ACTION,
            [ChatConst.CHAT_FROM]: chatFrom,
            [ChatConst.CHAT_MESSAGE]: message,
            [ChatConst.CHAT_TO]: ChatConst.CHAT_TYPE_SYSTEM
        };
        client.send('*', messageObject);
        // this.chatPlugin.chatManager.saveMessage(message, );
        /*
        let messageData = {
            act: ChatConst.CHAT_ACTION,
            m: message,
            f: playerSchema.playerName,
            t: ChatConst.CHAT_TYPE_NORMAL
        };
        room.broadcast('*', messageData);
        this.chatManager.saveMessage(
            message,
            playerSchema.player_id,
            playerSchema.state.room_id,
            false,
            ChatConst.CHAT_MESSAGE
        ).catch((err) => {
            Logger.error(['Chat save error:', err]);
        });
        */
    }

    gatherOtherPlayersOnTeam(team, filterIds)
    {
        let otherPlayers = [];
        for (let playerId of Object.keys(team.players)){
            playerId = Number(playerId);
            if(this.isFiltered(filterIds, playerId)){
                continue;
            }
            otherPlayers.push({
                client: team.clients[playerId],
                player: team.players[playerId]
            });
        }
        return otherPlayers;
    }

    isFiltered(filterIds, playerId)
    {
        for (let filterId of filterIds){
            if(filterId === playerId){
                return true;
            }
        }
        return false;
    }
}

module.exports.ChatMessageActions = ChatMessageActions;