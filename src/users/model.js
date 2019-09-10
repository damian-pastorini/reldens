/**
 *
 * Reldens - UsersModel
 *
 * Users storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { Model } = require('objection');

class UsersModel extends Model
{

    static get tableName()
    {
        return 'users';
    }

    static get relationMappings()
    {
        // to avoid require loop:
        const PlayersModel = require('./players-model');
        return {
            players: {
                relation: Model.HasManyRelation,
                modelClass: PlayersModel,
                join: {
                    from: 'users.id',
                    to: 'players.user_id'
                }
            }
        };
    }

    $beforeInsert(queryContext)
    {
        let currentDate = new Date().toISOString();
        this.created_at = currentDate;
        this.updated_at = currentDate;
    }

    $beforeUpdate(modelOptions, queryContext)
    {
        this.updated_at = new Date().toISOString();
    }

    async createUserWith(initialData)
    {
        let userData = initialData.data;
        let initState = initialData.state;
        let initStats = initialData.stats;
        let createdUser = await this.$query()
            .allowInsert('[player.stats, player.state]')
            .insertGraph({
                email: userData.email,
                username: userData.username,
                password: hash,
                role_id: 1,
                status: 1,
                player: {
                    name: userData.username,
                    stats: {
                        hp: initStats.hp,
                        mp: initStats.mp,
                        stamina: initStats.stamina,
                        atk: initStats.atk,
                        def: initStats.def,
                        dodge: initStats.dodge,
                        speed: initStats.speed
                    },
                    state: {
                        scene: initState.scene,
                        x: initState.x,
                        y: initState.y,
                        dir: initState.dir
                    }
                }
            });
        return createdUser;
    }

    /*
    $afterInsert(queryContext)
    {
        const PlayersModel = require('./players-model');
        PlayersModel.query()
            .allowInsert('[player.stats, player.state]')
            .insertGraph({
                user_id: this.id,
                stats: [{
                    user_id: 'Sage',
                    pets: [{
                        name: 'Fluffy'
                        species: 'dog'
                    }, {
                        name: 'Scrappy',
                        species: 'dog'
                    }]
                }]
            })
    }
    */

}

module.exports = UsersModel;
