/**
 *
 * Reldens - Test Increase Score On Kill Switches
 *
 */

const { BaseTest } = require('./base-test');
const { IncreaseScoreOnKillBuilder } = require('./fixtures/increase-score-on-kill-builder');

class TestIncreaseScoreOnKillSwitches extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.killBuilder = new IncreaseScoreOnKillBuilder();
        this.scoresConfig = this.killBuilder.scoresConfig;
    }

    createSwitchedKillSetup(switchedScoresConfig)
    {
        return new IncreaseScoreOnKillBuilder(
            Object.assign({}, this.scoresConfig, switchedScoresConfig)
        ).createKillSetup([], '2026-10-18', true);
    }

    expectScoreRow(setup, totalScore, playersKillsCount, npcsKillsCount)
    {
        this.assert.strictEqual(setup.scores.rows.length, 1);
        let scoreRow = [...setup.scores.rows].shift();
        this.assert.strictEqual(scoreRow.total_score, totalScore);
        this.assert.strictEqual(scoreRow.players_kills_count, playersKillsCount);
        this.assert.strictEqual(scoreRow.npcs_kills_count, npcsKillsCount);
    }

    expectNoScoreChange(setup)
    {
        this.assert.deepStrictEqual(setup.scores.rows, []);
        this.assert.deepStrictEqual(setup.scoresDetail.createdRows, []);
    }

    async testDisabledNpcKillsChangeNoScore()
    {
        await this.test('the disabled npc kills switch changes no score while the player kills still score', async () => {
            let setup = this.createSwitchedKillSetup({npcKills: {enabled: false}});
            this.assert.strictEqual(await this.killBuilder.killTheNpc(setup, false, {id: 6, killScore: 8}), false);
            this.expectNoScoreChange(setup);
            await this.killBuilder.killThePlayer(setup, 4);
            this.expectScoreRow(
                setup,
                this.scoresConfig.obtainedScorePerPlayer + 4 * this.scoresConfig.obtainedScorePerPlayerLevelMultiplier,
                1,
                0
            );
        });
    }

    async testDisabledPlayerKillsChangeNoScore()
    {
        await this.test('the disabled player kills switch changes no score while the npc kills still score', async () => {
            let setup = this.createSwitchedKillSetup({playerKills: {enabled: false}});
            this.assert.strictEqual(await this.killBuilder.killThePlayer(setup, 4), false);
            this.expectNoScoreChange(setup);
            await this.killBuilder.killTheNpc(setup, false, {id: 6, killScore: 8});
            this.expectScoreRow(setup, 8, 0, 1);
        });
    }

    async testBothKillsSwitchesDisabledChangeNoScore()
    {
        await this.test('both kills switches disabled change no score on any kill', async () => {
            let setup = this.createSwitchedKillSetup({npcKills: {enabled: false}, playerKills: {enabled: false}});
            this.assert.strictEqual(await this.killBuilder.killTheNpc(setup), false);
            this.assert.strictEqual(await this.killBuilder.killThePlayer(setup, 2), false);
            this.expectNoScoreChange(setup);
        });
    }

    async testEnabledKillsSwitchesScoreBothKillTypes()
    {
        await this.test('both kills switches enabled score the npc and the player kills', async () => {
            let setup = this.createSwitchedKillSetup({npcKills: {enabled: true}, playerKills: {enabled: true}});
            await this.killBuilder.killTheNpc(setup);
            await this.killBuilder.killThePlayer(setup, 0);
            this.expectScoreRow(
                setup,
                this.scoresConfig.obtainedScorePerNpc + this.scoresConfig.obtainedScorePerPlayer,
                1,
                1
            );
        });
    }

    async testMissingKillsSwitchesKeepBothKillTypesEnabled()
    {
        await this.test('missing kills switches keep both kill types enabled', async () => {
            let setup = this.killBuilder.createKillSetup([], '2026-10-18', true);
            await this.killBuilder.killThePlayer(setup, 2);
            await this.killBuilder.killTheNpc(setup);
            this.expectScoreRow(
                setup,
                this.scoresConfig.obtainedScorePerPlayer + 2 * this.scoresConfig.obtainedScorePerPlayerLevelMultiplier
                + this.scoresConfig.obtainedScorePerNpc,
                1,
                1
            );
        });
    }

    async testChangedKillsSwitchAppliesToTheNextKill()
    {
        await this.test('a kills switch changed after the start applies to the next kill', async () => {
            let switchedScoresConfig = Object.assign({}, this.scoresConfig, {npcKills: {enabled: true}});
            let setup = new IncreaseScoreOnKillBuilder(switchedScoresConfig).createKillSetup([], '2026-10-18', true);
            await this.killBuilder.killTheNpc(setup);
            this.expectScoreRow(setup, this.scoresConfig.obtainedScorePerNpc, 0, 1);
            switchedScoresConfig.npcKills.enabled = 0;
            this.assert.strictEqual(await this.killBuilder.killTheNpc(setup), false);
            this.expectScoreRow(setup, this.scoresConfig.obtainedScorePerNpc, 0, 1);
            this.assert.strictEqual(setup.scoresDetail.createdRows.length, 1);
            switchedScoresConfig.npcKills.enabled = 1;
            await this.killBuilder.killTheNpc(setup);
            this.expectScoreRow(setup, this.scoresConfig.obtainedScorePerNpc * 2, 0, 2);
        });
    }

}

module.exports.TestIncreaseScoreOnKillSwitches = TestIncreaseScoreOnKillSwitches;
