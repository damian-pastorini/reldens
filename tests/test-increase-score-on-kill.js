/**
 *
 * Reldens - Test Increase Score On Kill
 *
 */

const { BaseTest } = require('./base-test');
const { IncreaseScoreOnKill } = require('../lib/scores/server/subscriber/increase-score-on-kill');
const { IncreaseScoreOnKillMapper } = require('../lib/scores/server/mapper/increase-score-on-kill-mapper');

class TestIncreaseScoreOnKill extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.scoresConfig = {
            obtainedScorePerPlayer: 10,
            obtainedScorePerNpc: 5,
            useNpcCustomScore: true,
            obtainedScorePerPlayerLevelMultiplier: 3
        };
    }

    createIncreaseScoreOnKill(scoresConfig)
    {
        return new IncreaseScoreOnKill({
            config: {getWithoutLogs: () => scoresConfig},
            dataServer: {getEntity: () => ({})}
        });
    }

    createPlayerDeathEvent(killedPlayerLevel)
    {
        return {
            room: {},
            attackerPlayer: {player_id: 1},
            targetSchema: {player_id: 2, skillsServer: {classPath: {currentLevel: killedPlayerLevel}}}
        };
    }

    async testPlayerKillAddsTheKilledPlayerLevelScore()
    {
        await this.test('a player kill adds the killed player level times the level multiplier', async () => {
            let killedPlayerLevel = 4;
            let scoreProps = new IncreaseScoreOnKillMapper().fromPlayerDeathEvent(
                this.createPlayerDeathEvent(killedPlayerLevel)
            );
            this.assert.strictEqual(scoreProps.killedPlayerLevel, killedPlayerLevel);
            this.assert.strictEqual(
                this.createIncreaseScoreOnKill(this.scoresConfig).determineObtainedScore(scoreProps, true),
                this.scoresConfig.obtainedScorePerPlayer
                    + killedPlayerLevel * this.scoresConfig.obtainedScorePerPlayerLevelMultiplier
            );
        });
    }

    async testPlayerKillWithoutMultiplierKeepsTheFixedScore()
    {
        await this.test('a player kill without level multiplier gives the fixed player score', async () => {
            let scoresConfig = Object.assign({}, this.scoresConfig, {obtainedScorePerPlayerLevelMultiplier: 0});
            let scoreProps = new IncreaseScoreOnKillMapper().fromPlayerDeathEvent(this.createPlayerDeathEvent(9));
            this.assert.strictEqual(
                this.createIncreaseScoreOnKill(scoresConfig).determineObtainedScore(scoreProps, true),
                scoresConfig.obtainedScorePerPlayer
            );
        });
    }

    async testNpcKillScoreComesFromTheObject()
    {
        await this.test('an npc kill gives the object kill score', async () => {
            let killScore = 8;
            let scoreProps = new IncreaseScoreOnKillMapper().fromBattleEndedEvent({
                room: {},
                playerSchema: {player_id: 1},
                pve: {targetObject: {id: 6, killScore}}
            });
            this.assert.strictEqual(scoreProps.obtainedNpcCustomScore, killScore);
            this.assert.strictEqual(scoreProps.killedPlayerLevel, 0);
            this.assert.strictEqual(
                this.createIncreaseScoreOnKill(this.scoresConfig).determineObtainedScore(scoreProps, false),
                killScore
            );
        });
    }

    async testNpcWithoutKillScoreGivesTheDefaultNpcScore()
    {
        await this.test('an npc kill without kill score gives the configured npc score', async () => {
            let scoreProps = new IncreaseScoreOnKillMapper().fromBattleEndedEvent({
                room: {},
                playerSchema: {player_id: 1},
                pve: {targetObject: {id: 7}}
            });
            this.assert.strictEqual(
                this.createIncreaseScoreOnKill(this.scoresConfig).determineObtainedScore(scoreProps, false),
                this.scoresConfig.obtainedScorePerNpc
            );
        });
    }

    async testNpcWithZeroKillScoreGivesNoPoints()
    {
        await this.test('an npc kill with a zero kill score gives no points', async () => {
            let scoreProps = new IncreaseScoreOnKillMapper().fromBattleEndedEvent({
                room: {},
                playerSchema: {player_id: 1},
                pve: {targetObject: {id: 6, killScore: 0, useNpcCustomScore: 3}}
            });
            this.assert.strictEqual(scoreProps.obtainedNpcCustomScore, 0);
            this.assert.strictEqual(
                this.createIncreaseScoreOnKill(this.scoresConfig).determineObtainedScore(scoreProps, false),
                0
            );
        });
    }

    async testNpcWithInvalidKillScoreGivesTheDefaultNpcScore()
    {
        await this.test('an npc kill with an invalid kill score gives the configured npc score', async () => {
            let scoreProps = new IncreaseScoreOnKillMapper().fromBattleEndedEvent({
                room: {},
                playerSchema: {player_id: 1},
                pve: {targetObject: {id: 6, killScore: 'many'}}
            });
            this.assert.strictEqual(
                this.createIncreaseScoreOnKill(this.scoresConfig).determineObtainedScore(scoreProps, false),
                this.scoresConfig.obtainedScorePerNpc
            );
        });
    }

    async testNpcKillScoreIsIgnoredWithoutTheCustomScoreConfig()
    {
        await this.test('the npc kill score is ignored while the npc custom score is disabled', async () => {
            let scoresConfig = Object.assign({}, this.scoresConfig, {useNpcCustomScore: false});
            let scoreProps = new IncreaseScoreOnKillMapper().fromBattleEndedEvent({
                room: {},
                playerSchema: {player_id: 1},
                pve: {targetObject: {id: 6, killScore: 0}}
            });
            this.assert.strictEqual(
                this.createIncreaseScoreOnKill(scoresConfig).determineObtainedScore(scoreProps, false),
                scoresConfig.obtainedScorePerNpc
            );
        });
    }

    async testMapperResetsThePreviousEventData()
    {
        await this.test('the mapper resets the data of the previous event', async () => {
            let mapper = new IncreaseScoreOnKillMapper();
            mapper.fromPlayerDeathEvent(this.createPlayerDeathEvent(4));
            mapper.fromBattleEndedEvent({room: {}, playerSchema: {player_id: 1}, pve: {targetObject: {id: 7}}});
            this.assert.strictEqual(mapper.killPlayerId, null);
            this.assert.strictEqual(mapper.killedPlayerLevel, 0);
            this.assert.strictEqual(mapper.killNpcId, 7);
        });
    }

}

module.exports.TestIncreaseScoreOnKill = TestIncreaseScoreOnKill;
