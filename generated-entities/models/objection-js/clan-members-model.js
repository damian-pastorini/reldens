/**
 *
 * Reldens - ClanMembersModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ClanMembersModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'clan_members';
    }

    static get relationMappings()
    {
        const { ClanModel } = require('./clan-model');
        const { PlayersModel } = require('./players-model');
        return {
            related_clan: {
                relation: this.BelongsToOneRelation,
                modelClass: ClanModel,
                join: {
                    from: this.tableName+'.clan_id',
                    to: ClanModel.tableName+'.id'
                }
            },
            related_players: {
                relation: this.BelongsToOneRelation,
                modelClass: PlayersModel,
                join: {
                    from: this.tableName+'.player_id',
                    to: PlayersModel.tableName+'.id'
                }
            }
        };
    }
}

module.exports.ClanMembersModel = ClanMembersModel;
