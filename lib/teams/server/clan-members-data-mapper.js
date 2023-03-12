/**
 *
 * Reldens - ClanMembersDataMapper
 *
 */

class ClanMembersDataMapper
{

    static fetchPlayersData(clan)
    {
        let teamPlayersId = Object.keys(clan.members);
        let membersData = {};
        for(let i of teamPlayersId){
            membersData[i] = {
                name: clan.members[i].playerName,
                level: clan.members[i].level,
                id: clan.members[i].player_id,
                sessionId: clan.members[i].sessionId,
            };
        }
        return membersData;
    }

}

module.exports.ClanMembersDataMapper = ClanMembersDataMapper;
