/**
 *
 * Reldens - Test Sample Data Skill Properties
 *
 * Tests that every stats property of the sample skills attacks (affected, attack, defense, aim and dodge properties) is
 * a stat key of the same sample data file, in the production and the test sample data, so the skills never read a
 * missing stat (a missing one makes the attack and defense totals false and the damage ignores the stats).
 *
 */

const { BaseTest } = require('./base-test');
const { FileHandler } = require('@reldens/server-utils');

class TestSampleDataSkillProperties extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.sampleDataPaths = [
            FileHandler.joinPaths(process.cwd(), 'migrations', 'production', 'reldens-sample-data-v4.0.0.sql'),
            FileHandler.joinPaths(process.cwd(), 'migrations', 'development', 'reldens-test-sample-data-v4.0.0.sql')
        ];
    }

    loadTableRows(sampleData, tableName)
    {
        let rowsStart = sampleData.indexOf('REPLACE INTO `'+tableName+'`');
        if(-1 === rowsStart){
            return '';
        }
        return sampleData.substring(rowsStart, sampleData.indexOf(');', rowsStart) + 2);
    }

    async testEverySkillAttackStatsPropertyIsASampleStat()
    {
        await this.test('every stats property of the sample skills attacks is a stat key of the same sample data', async () => {
            let results = [];
            for(let sampleDataPath of this.sampleDataPaths){
                let sampleData = FileHandler.readFile(sampleDataPath);
                let statsKeys = [...this.loadTableRows(sampleData, 'stats').matchAll(/\(\d+, '([^']+)'/g)].map(
                    statMatch => statMatch[1]
                );
                let attackStatsKeys = [...this.loadTableRows(sampleData, 'skills_skill_attack').matchAll(
                    /stats\/([A-Za-z0-9_-]+)/g
                )].map(propertyMatch => propertyMatch[1]);
                results.push({
                    hasAttackStats: 0 < attackStatsKeys.length,
                    missingStatsKeys: attackStatsKeys.filter(statKey => -1 === statsKeys.indexOf(statKey))
                });
            }
            let expectedResult = {hasAttackStats: true, missingStatsKeys: []};
            this.assert.deepStrictEqual(results, [expectedResult, expectedResult]);
        });
    }

}

module.exports.TestSampleDataSkillProperties = TestSampleDataSkillProperties;
