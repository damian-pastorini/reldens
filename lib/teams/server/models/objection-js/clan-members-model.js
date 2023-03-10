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
                relation: this.HasManyRelation,
                modelClass: PlayersModel,
                join: {
                    from: this.tableName+'.id',
                    to: PlayersModel.tableName+'.player_id'
                }
            }
        }
    }

}

module.exports.ClanMembersModel = ClanMembersModel;
