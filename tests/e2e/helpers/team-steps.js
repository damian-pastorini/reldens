/**
 *
 * Reldens - Team Steps
 *
 * The steps of the teams specs: the group players logged in their scene (the first two on the spec pages and the third
 * one on its own client page) with the room messages and the chat messages recorded on each client, each player with
 * its page, config, name, player id and session id; an invite and an answer sent with the team messages a client sends
 * (the accept value "1" and the decline value "2"), a team formed by an invite and its accept; the team messages a
 * client received; and the live teams and pending invites of the server (TeamsProbe).
 *
 */

const { expect } = require('@playwright/test');
const { Login } = require('./login');
const { ChatSteps } = require('./chat-steps');
const { RoomMessagesRecorder } = require('./room-messages-recorder');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { SecurityApi } = require('./security-api');
const { TimeConstants } = require('./time-constants');
const { TeamsConst } = require('../../../lib/teams/constants');

class TeamSteps
{

    static ACCEPT = '1';
    static DECLINE = '2';
    static USER_SUFFIXES = ['', '2', '3'];

    static async enterPlayers(context, playersCount = 2)
    {
        let pages = [context.page, context.secondPage];
        let players = [];
        for(let playerIndex = 0; playerIndex < playersCount; playerIndex++){
            let suffix = TeamSteps.USER_SUFFIXES[playerIndex];
            let page = pages[playerIndex];
            if(!page){
                page = (await Login.openClientPage(context.page, context.gameConfig)).clientPage;
            }
            await Login.loginRootPlayer(page, context.gameConfig, context.longRun, suffix);
            let playerName = context.gameConfig['e2ePlayerName'+suffix];
            players.push({
                page,
                playerName,
                playerId: await E2eSeedAndRestoreApi.fetchRowId(context.gameConfig, 'players', {name: playerName}),
                sessionId: await page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId)
            });
        }
        for(let player of players){
            await RoomMessagesRecorder.start(player.page);
            await ChatSteps.recordChat(player.page);
        }
        return players;
    }

    static async invite(fromPlayer, toPlayer)
    {
        await RoomMessagesRecorder.sendMessage(fromPlayer.page, {act: TeamsConst.ACTIONS.TEAM_INVITE, id: toPlayer.playerId});
    }

    static async answer(answeringPlayer, inviterPlayer, value)
    {
        await RoomMessagesRecorder.sendMessage(
            answeringPlayer.page,
            {act: TeamsConst.ACTIONS.TEAM_ACCEPTED, id: inviterPlayer.playerId, value}
        );
    }

    static async formTeam(gameConfig, ownerPlayer, memberPlayers)
    {
        for(let memberPlayer of memberPlayers){
            await TeamSteps.invite(ownerPlayer, memberPlayer);
            await TeamSteps.waitForInvite(gameConfig, ownerPlayer, memberPlayer);
            await TeamSteps.answer(memberPlayer, ownerPlayer, TeamSteps.ACCEPT);
        }
        await expect.poll(
            async () => (await TeamSteps.fetchState(gameConfig)).teams[ownerPlayer.playerId]?.playersIds || [],
            {message: 'The team is formed', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual([ownerPlayer, ...memberPlayers].map(player => player.playerId).sort((idA, idB) => idA - idB));
    }

    static async waitForInvite(gameConfig, inviterPlayer, invitedPlayer)
    {
        await expect.poll(
            async () => (await TeamSteps.fetchState(gameConfig)).pendingInvites[inviterPlayer.playerId] || [],
            {message: 'The invite is pending', timeout: TimeConstants.SERVER_RESPONSE}
        ).toContain(invitedPlayer.playerId);
    }

    static async fetchMessages(player, act)
    {
        return await RoomMessagesRecorder.fetchMessages(player.page, act);
    }

    static async fetchState(gameConfig)
    {
        return await SecurityApi.request(gameConfig, 'GET', '/api/e2e/teams/state');
    }

}

module.exports.TeamSteps = TeamSteps;
