/**
 *
 * Reldens - Test Users Manager Create Player
 *
 * Tests UsersManager.createPlayer with recording repositories: a created player gets its state and one stats row per
 * stat; a state or a stats insert that rejects deletes the stored player (its quests progress first) and rejects with
 * the same error, so a failed creation leaves no player behind (ISSUE #418); a player row that is not stored creates
 * nothing else and deletes nothing; and a player without state data creates only its stats.
 *
 */

const { BaseTest } = require('./base-test');
const { UsersManager } = require('../lib/users/server/manager');

class TestUsersManagerCreatePlayer extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.playerId = 7;
        this.stats = [{id: 1, base_value: 100}, {id: 2, base_value: 50}];
        this.playerData = {name: 'player-7', user_id: 3, state: {room_id: 4, x: 10, y: 20, dir: 'down'}};
    }

    createSetup(failures)
    {
        let setup = {created: [], deleted: []};
        let usersManager = Object.create(UsersManager.prototype);
        let rejectOn = (step) => failures[step] ? Promise.reject(new Error(step+' failed.')) : false;
        usersManager.playersRepository = {
            create: async (row) => {
                setup.created.push(['player', row]);
                return failures.player ? false : {id: this.playerId, ...row};
            },
            deleteById: async (playerId) => setup.deleted.push(['player', playerId])
        };
        usersManager.playerStateRepository = {
            create: async (row) => {
                setup.created.push(['state', row]);
                return await rejectOn('state') || {id: 9, ...row};
            }
        };
        usersManager.statsRepository = {loadAll: async () => this.stats};
        usersManager.playerStatsRepository = {
            create: async (row) => {
                setup.created.push(['stat', row.stat_id]);
                return await rejectOn('stats') || row;
            }
        };
        usersManager.questsProgressRepository = {
            delete: async (filters) => setup.deleted.push(['questsProgress', filters.player_id])
        };
        setup.usersManager = usersManager;
        return setup;
    }

    async testACreatedPlayerGetsItsStateAndStats()
    {
        await this.test('a created player gets its state and one stats row per stat and nothing is deleted', async () => {
            let setup = this.createSetup({});
            let player = await setup.usersManager.createPlayer(this.playerData);
            this.assert.deepStrictEqual(
                [player.id, player.related_players_state.player_id, setup.created.map(entry => entry[0]), setup.deleted],
                [this.playerId, this.playerId, ['player', 'state', 'stat', 'stat'], []]
            );
        });
    }

    async testAFailedInsertDeletesTheStoredPlayer()
    {
        await this.test('a state or stats insert that rejects deletes the stored player and rejects the same error', async () => {
            for(let failingStep of ['state', 'stats']){
                let setup = this.createSetup({[failingStep]: true});
                await this.assert.rejects(
                    setup.usersManager.createPlayer(this.playerData),
                    {message: failingStep+' failed.'},
                    'Rejected by '+failingStep
                );
                this.assert.deepStrictEqual(
                    setup.deleted,
                    [['questsProgress', this.playerId], ['player', this.playerId]],
                    'Deleted after the '+failingStep+' failure'
                );
            }
        });
    }

    async testAPlayerNotStoredCreatesNothingElse()
    {
        await this.test('a player row that is not stored creates no state or stats and deletes nothing', async () => {
            let setup = this.createSetup({player: true});
            this.assert.deepStrictEqual(
                [await setup.usersManager.createPlayer(this.playerData), setup.created.map(entry => entry[0]), setup.deleted],
                [false, ['player'], []]
            );
        });
    }

    async testAPlayerWithoutStateCreatesOnlyItsStats()
    {
        await this.test('a player without state data creates only its stats', async () => {
            let setup = this.createSetup({});
            let player = await setup.usersManager.createPlayer({name: 'player-7', user_id: 3});
            this.assert.deepStrictEqual(
                [Boolean(player.related_players_state), setup.created.map(entry => entry[0]), setup.deleted],
                [false, ['player', 'stat', 'stat'], []]
            );
        });
    }

}

module.exports.TestUsersManagerCreatePlayer = TestUsersManagerCreatePlayer;
