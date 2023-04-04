/**
 *
 * Reldens - ClanFactory
 *
 */

const { Clan } = require('./clan');
const { Logger } = require('@reldens/utils');

class ClanFactory
{

    static async create(clanId, playerOwner, clientOwner, sharedProperties, teamsPlugin)
    {
        let clanModel = await teamsPlugin.dataServer.getEntity('clan').loadByIdWithRelations(
            clanId,
            ['members.parent_player, parent_level.modifiers']
        );
        if(!clanModel){
            Logger.error('Clan not found by ID "'+clanId+'".');
            return false;
        }
        teamsPlugin.clans[clanId] = Clan.fromModel({
            clanModel,
            owner: playerOwner,
            ownerClient: clientOwner,
            sharedProperties
        });
    }

}

module.exports.ClanFactory = ClanFactory;
