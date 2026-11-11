/**
 *
 * Reldens - Teams Probe
 *
 * Server side e2e endpoint for the teams specs: the live teams of the teams plugin (each team by its owner id with its
 * owner and members player ids), the pending invites (by the inviting player id, the invited players ids) and the
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
        Logger.info('[teams-probe] Teams endpoints registered.');
    }

}

module.exports.TeamsProbe = TeamsProbe;
