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
        let { ClanModel } = require('./clan-model');
        let { PlayersModel } = require('../../../../users/server/models/objection-js/players-model');
        return {
            parent_clan: {
                relation: this.HasOneRelation,
                modelClass: ClanModel,
                join: {
                    from: this.tableName+'.clan_id',
                    to: ClanModel.tableName+'.id'
                }
            },
            parent_player: {
                relation: this.HasOneRelation,
                modelClass: PlayersModel,
                join: {
                    from: this.tableName+'.player_id',
                    to: PlayersModel.tableName+'.id'
                }
            }
        }
    }

}

module.exports.ClanMembersModel = ClanMembersModel;
