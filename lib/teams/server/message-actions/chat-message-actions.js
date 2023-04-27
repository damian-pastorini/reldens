const { sc, Logger } = require('@reldens/utils');
const { ChatConst } = require('../../../chat/constants');
const { TeamsConst } = require('../../constants');

class ChatMessageActions
{
    constructor(props)
    {
        this.events = sc.get(props, 'events', false);
        this.chatPlugin = sc.get(props, 'chatPlugin', false);
        this.client = false;
        if (!this.events) {
            Logger.error('EventsManager undefined in Teams ChatMessageActions');
        }
        if (!this.chatPlugin) {
            Logger.error('ChatPlugin undefined in Teams ChatMessageActions');
        }
    }

    listenEvents()
    {
        this.inviteTeamAcceptedEventListener();
        this.inviteTeamRejectedEventListener();
        this.teamMemberLeaveEventListener();
        this.inviteClanAcceptedEventListener();
        this.inviteClanRejectedEventListener();
    }

    inviteTeamAcceptedEventListener()
    {
        this.events.on('reldens.afterPlayerJoinedTeam', (props) => {
            let playerJoiningSchema = sc.get(props, 'playerJoiningSchema', false);
            if (!playerJoiningSchema) {
                return false;
            }
            let currentTeam = sc.get(props, 'currentTeam', false);
            if (!currentTeam) {
                return false;
            }
            let playerJoiningName = playerJoiningSchema.playerName;
            let message = this.createMessage(
                TeamsConst.CHAT.MESSAGE.INVITE_ACCEPTED,
                playerJoiningName
            );
            this.sendMessage(message, 'Team', currentTeam.ownerClient);
            let otherPlayers = this.gatherOtherPlayersOnTeam(currentTeam, playerJoiningSchema.player_id);
            for (let otherPlayer of otherPlayers) {
                let message = this.createMessage(TeamsConst.CHAT.MESSAGE.ENTER,
                    playerJoiningName,
                    'team');
                this.sendMessage(message, 'Team', otherPlayer.client);
            }
        });
    }

    inviteTeamRejectedEventListener()
    {
        this.events.on('reldens.teamJoinInviteRejected', (props) => {
            let clientSendingInvite = sc.get(props, 'clientSendingInvite', false);
            let playerRejectingName = sc.get(props, 'playerRejectingName', false);
            if (!clientSendingInvite ||
                !playerRejectingName) {
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
        this.events.on('reldens.afterTeamLeave', (props) => {
            let currentTeam = sc.get(props, 'currentTeam', false);
            if (!currentTeam) {
                return false;
            }
            let leavingPlayerName = sc.get(props, 'leavingPlayerName', false);
            if (!leavingPlayerName) {
                return false;
            }
            let message = this.createMessage(
                TeamsConst.CHAT.MESSAGE.LEAVE,
                leavingPlayerName,
                'team'
            );
            for (let playerId of Object.keys(currentTeam.players)) {
                this.sendMessage(message, 'Team', currentTeam.clients[playerId]);
            }
        });
    }


    inviteClanAcceptedEventListener()
    {
        this.events.on('reldens.afterPlayerJoinedClan', (props) => {
            let playerJoining = sc.get(props, 'playerJoining', false);
            if (!playerJoining) {
                return false;
            }
            let clan = sc.get(props, 'clan', false);
            if (!clan) {
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
            if (!clientSendingInvite ||
                !playerRejectingName) {
                return false;
            }
            let message = this.createMessage(
                TeamsConst.CHAT.MESSAGE.INVITE_REJECTED,
                playerRejectingName
            );
            this.sendMessage(message, 'Clan', clientSendingInvite);
        });
    }

    createMessage(baseChatMessage, playerName, groupName = false)
    {
        let message = baseChatMessage.replace('%playerName', playerName);
        if (groupName) {
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

        // this.chatPlugin.chatManager.saveMessage();
    }

    gatherOtherPlayersOnTeam(team, playerJoiningId)
    {
        let otherPlayers = [];
        for (let playerId of Object.keys(team.players)) {
            playerId = Number(playerId);
            if (!this.isJoiningPlayer(playerId, playerJoiningId) &&
                !this.isTeamOwnerPlayer(playerId, team)) {
                otherPlayers.push({
                    client: team.clients[playerId],
                    player: team.players[playerId]
                });
            }
        }
        return otherPlayers;
    }

    isTeamOwnerPlayer(playerId, team)
    {
        return playerId === team.owner.player_id;
    }

    isJoiningPlayer(playerId, playerJoiningId)
    {
        return playerId === playerJoiningId;
    }
}

module.exports.ChatMessageActions = ChatMessageActions;