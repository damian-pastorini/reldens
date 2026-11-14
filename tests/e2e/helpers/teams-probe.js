/**
 *
 * Reldens - Teams Probe
 *
 * Server side e2e endpoints for the teams specs: the live teams of the teams plugin (each team by its owner id with its
 * owner and members player ids), the session id of the owner client a team sends its owner messages to, the team
 * record a scene change leaves for a player seeded for a logged out group player (the state a disconnection during a
 * scene change leaves, so its next login joins that team again; the players reset deletes it), the pending invites (by the inviting player id, the invited players ids) and the
 * loaded clans (each clan by its id with its owner, members, connected players and pending invites players ids).
 *
 */

const { Logger, sc } = require('@reldens/utils');

class TeamsProbe
{

    static fetchTeamsState(serverManager)
    {
        let teamsPlugin = sc.get(sc.get(serverManager.featuresManager.featuresList, 'teams', {}), 'package', false);
        if(!teamsPlugin){
            return {error: 'Teams plugin not found.'};
        }
        let teams = {};
        for(let ownerId of Object.keys(teamsPlugin.teams)){
            let team = teamsPlugin.teams[ownerId];
            teams[ownerId] = {
                ownerId: Number(team.owner.player_id),
                playersIds: Object.keys(team.players).map(Number).sort((idA, idB) => idA - idB)
            };
        }
        let pendingInvites = {};
        for(let inviterId of Object.keys(teamsPlugin.teamPendingInvites)){
            pendingInvites[inviterId] = Object.keys(teamsPlugin.teamPendingInvites[inviterId]).filter(
                invitedId => true === teamsPlugin.teamPendingInvites[inviterId][invitedId]
            ).map(Number);
        }
        let clans = {};
        for(let clanId of Object.keys(teamsPlugin.clans || {})){
            let clan = teamsPlugin.clans[clanId];
            clans[clanId] = {
                ownerId: Number(clan.owner?.player_id || 0),
                membersIds: Object.keys(clan.members || {}).map(Number).sort((idA, idB) => idA - idB),
                connectedIds: Object.keys(clan.players || {}).map(Number).sort((idA, idB) => idA - idB),
                pendingInvites: Object.keys(clan.pendingInvites || {}).filter(
                    invitedId => true === clan.pendingInvites[invitedId]
                ).map(Number)
            };
        }
        return {teams, pendingInvites, clans};
    }

    static registerEndpoints(serverManager)
    {
        serverManager.app.get('/api/e2e/teams/state', (request, response) => {
            response.json(TeamsProbe.fetchTeamsState(serverManager));
        });
        serverManager.app.post('/api/e2e/teams/changing-room-record', (request, response) => {
            let teamsPlugin = sc.get(sc.get(serverManager.featuresManager.featuresList, 'teams', {}), 'package', {});
            let playerId = Number(sc.get(request.body, 'playerId', 0));
            teamsPlugin.teamChangingRoomPlayers[playerId] = {
                teamId: Number(sc.get(request.body, 'teamId', 0)),
                leavingPlayerSessionId: ''
            };
            response.json({record: teamsPlugin.teamChangingRoomPlayers[playerId]});
        });
        serverManager.app.get('/api/e2e/teams/owner-session', (request, response) => {
            let teams = sc.get(sc.get(serverManager.featuresManager.featuresList, 'teams', {}), 'package', {}).teams;
            let team = sc.get(teams || {}, sc.get(request.query, 'ownerId', ''), false);
            response.json({ownerSessionId: team ? String(sc.get(team.ownerClient, 'sessionId', '')) : ''});
        });
        Logger.info('[teams-probe] Teams endpoints registered.');
    }

}

module.exports.TeamsProbe = TeamsProbe;
