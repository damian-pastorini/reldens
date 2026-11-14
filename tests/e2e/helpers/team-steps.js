/**
 *
 * Reldens - Team Steps
 *
 * The steps of the teams specs: the group players logged in their scene (the first two on the spec pages and the third
 * one on its own client page) with the room messages and the chat messages recorded on each client, each player with
 * its page, config, name, player id and session id; a player moved to the next scene by its change point (its room
 * messages and chat recorded again once the preloader of the new scene runs); a server event cancelled for the group
 * (GameplayE2eStateApi.cancelEvent with the flag of that event) and the wait for its next cancelled run; an invite and
 * an answer sent with the
 * team messages a client sends
 * (the player ids as strings like the target and request boxes send them, the accept value "1" and the decline value
 * "2"), a team formed by an invite and its accept; the team messages a
 * client received; and the live teams and pending invites of the server (TeamsProbe).
 *
 */

const { expect } = require('@playwright/test');
const { Login } = require('./login');
const { ChatSteps } = require('./chat-steps');
const { RoomMessagesRecorder } = require('./room-messages-recorder');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { SecurityApi } = require('./security-api');
const { RoomObjectsApi } = require('./room-objects-api');
const { GameplayE2eStateApi } = require('./gameplay-e2e-state-api');
const { Navigation } = require('./navigation');
const { TimeConstants } = require('./time-constants');
const { TeamsConst } = require('../../../lib/teams/constants');
const { GameConst } = require('../../../lib/game/constants');

class TeamSteps
{

    static ACCEPT = '1';
    static DECLINE = '2';
    static USER_SUFFIXES = ['', '2', '3'];
    static waitForScenePreloader = (page, roomName) => page.waitForFunction(
        (preloaderName) => Boolean(window.reldens.gameEngine.scene.getScene(preloaderName)?.sys.isActive()),
        GameConst.SCENE_PRELOADER+roomName,
        {timeout: TimeConstants.SCENE_LOAD}
    );

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

    static async changeScene(context, player, roomName = Login.TOWN_ROOM_NAME, nextRoomName = Login.FOREST_ROOM_NAME)
    {
        let placed = await RoomObjectsApi.placePlayerOnChangePoint(player.page, context.gameConfig, roomName, nextRoomName);
        expect(placed.position, player.playerName+' is placed on the change point to '+nextRoomName+': '+placed.error)
            .toBeTruthy();
        await Navigation.waitForRoom(player.page, nextRoomName, TimeConstants.ROOM_TRANSITION);
        await TeamSteps.waitForScenePreloader(player.page, nextRoomName);
        await RoomMessagesRecorder.start(player.page);
        await ChatSteps.recordChat(player.page);
    }

    static async cancelEvent(context, eventName, flagKey)
    {
        let cancelled = await GameplayE2eStateApi.cancelEvent(context.gameConfig, context.e2eGroup, eventName, flagKey);
        expect(cancelled.cancelled, 'The event '+eventName+' is cancelled for the group: '+cancelled.error).toBe(true);
        return cancelled.cancelledCount;
    }

    static async waitForCancelled(context, eventName, previousCount)
    {
        await expect.poll(
            async () => (await SecurityApi.request(
                context.gameConfig,
                'GET',
                '/api/e2e/live-objects/cancelled-events'
            ))[eventName] || 0,
            {message: 'The event '+eventName+' runs and is cancelled', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBeGreaterThan(previousCount);
    }

    static async invite(fromPlayer, toPlayer)
    {
        await RoomMessagesRecorder.sendMessage(fromPlayer.page, {act: TeamsConst.ACTIONS.TEAM_INVITE, id: String(toPlayer.playerId)});
    }

    static async answer(answeringPlayer, inviterPlayer, value)
    {
        await RoomMessagesRecorder.sendMessage(
            answeringPlayer.page,
            {act: TeamsConst.ACTIONS.TEAM_ACCEPTED, id: String(inviterPlayer.playerId), value}
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

    static sortedIds(players)
    {
        return players.map(player => player.playerId).sort((idA, idB) => idA - idB);
    }

    static async expectTeams(gameConfig, expectedTeams, message)
    {
        await expect.poll(async () => {
            let teams = (await TeamSteps.fetchState(gameConfig)).teams || {};
            return Object.keys(teams).map(ownerId => [Number(ownerId), teams[ownerId].playersIds]);
        }, {message, timeout: TimeConstants.SERVER_RESPONSE}).toEqual(expectedTeams);
    }

    static async fetchState(gameConfig)
    {
        return await SecurityApi.request(gameConfig, 'GET', '/api/e2e/teams/state');
    }

    static async expectUpdateWith(player, owner, memberId, message)
    {
        await expect.poll(
            async () => (await TeamSteps.fetchMessages(player, TeamsConst.ACTIONS.TEAM_UPDATE)).some(
                update => owner.playerName === update.leaderName && Object.keys(update.players).includes(String(memberId))
            ),
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(true);
    }

    static async expectMemberBox(member, owner)
    {
        await expect(member.page.locator('#box-'+TeamsConst.KEY+owner.playerId), 'The member box in the new room')
            .toContainText(
                TeamsConst.LABELS.TEAM.LEADER_NAME_TITLE.replace('%leaderName', owner.playerName),
                {timeout: TimeConstants.SERVER_RESPONSE}
            );
    }

}

module.exports.TeamSteps = TeamSteps;
