/**
 *
 * Reldens - ClanModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ClanModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'clan';
    }

    static get relationMappings()
    {
        const { PlayersModel } = require('./players-model');
        const { ClanLevelsModel } = require('./clan-levels-model');
        const { ClanMembersModel } = require('./clan-members-model');
        return {
            related_players: {
                relation: this.BelongsToOneRelation,
                modelClass: PlayersModel,
                join: {
                    from: this.tableName+'.owner_id',
                    to: PlayersModel.tableName+'.id'
                }
            },
            related_clan_levels: {
                relation: this.BelongsToOneRelation,
                modelClass: ClanLevelsModel,
                join: {
                    from: this.tableName+'.level',
                    to: ClanLevelsModel.tableName+'.key'
                }
            },
            related_clan_members: {
                relation: this.HasManyRelation,
                modelClass: ClanMembersModel,
                join: {
                    from: this.tableName+'.id',
                    to: ClanMembersModel.tableName+'.clan_id'
                }
            }
        };
    }
}

module.exports.ClanModel = ClanModel;
