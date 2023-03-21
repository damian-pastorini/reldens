/**
 *
 * Reldens - ClanMessageActions
 *
 */
const {TeamsConst} = require("../../constants");

class ClanCreate
{
    static async execute(client, data, room, playerSchema, teamsPlugin)
    {
        let characterLimit = TeamsConst.NAME_LIMIT;
        let clanName = data[TeamsConst.ACTIONS.CLAN_NAME]?.toString().replace(/\\/g, '').substring(0, characterLimit);
        // @TODO - Finish.
    }
}

module.exports.ClanCreate = ClanCreate;
