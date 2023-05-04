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
                playerJoining.playerName,
                'team'
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
                playerRejectingName,
                'team'
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
                this.sendMessage(message, 'Team', leavingPlayer.client);
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
                Logger.error('Leaving player ID undefined on "clanLeaveBeforeSendUpdate" event.');
                return false;
            }
            let currentClan = sc.get(props, 'currentClan', false);
            if(!currentClan){
                Logger.error('Clan undefined on "clanLeaveBeforeSendUpdate" event.');
                return false;
            }
            let disbandClan = sc.get(props, 'disbandClan', false);
            if(disbandClan){
                this.clanDisbanding(currentClan);
                return true;
            }
            let leavingPlayer = currentClan.players[playerLeavingId];
            let message = this.createMessage(
                TeamsConst.CHAT.MESSAGE.LEAVE,
                leavingPlayer.playerName,
                'clan'
            );
            this.sendMessage(message, 'Clan', currentClan.clients[playerLeavingId]);
        });
    }

    clanDisbanding(currentClan)
    {
        for(let i of Object.keys(currentClan.clients)){
            let message = this.createMessage(
                TeamsConst.CHAT.MESSAGE.DISBANDED,
                currentClan.players[i].playerName,
                'clan'
            );
            this.sendMessage(message, 'clan', currentClan.clients[i]);
        }
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
        if(!client){
            Logger.critical('Client undefined for message.', message, chatFrom, client);
            return false;
        }
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