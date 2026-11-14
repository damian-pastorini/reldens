/**
 *
 * Reldens - Test Animation Engine
 *
 */

const { BaseTest } = require('./base-test');
const { ObjectAnimationsBuilder } = require('./fixtures/object-animations-builder');

class TestAnimationEngine extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.enemyProps = {key: 'enemy_forest_1', id: 6, asset_key: 'enemy_forest_1', frameStart: 12, frameEnd: 26};
    }

    async testDirectionAnimationKeepsTheFirstSpritesheetFrame()
    {
        await this.test('a direction animation starting on frame 0 keeps it when the object frames start later', async () => {
            let downKey = 'respawn-area-monsters-lvl-1-2_6_down';
            let rightKey = 'respawn-area-monsters-lvl-1-2_6_right';
            let createdAnimations = ObjectAnimationsBuilder.build(this.enemyProps, {
                [downKey]: {start: 0, end: 2},
                [rightKey]: {start: 6, end: 8}
            });
            this.assert.deepStrictEqual(createdAnimations[downKey].frames, {start: 0, end: 2});
            this.assert.deepStrictEqual(createdAnimations[rightKey].frames, {start: 6, end: 8});
        });
    }

    async testAnimationWithoutFramesUsesTheObjectFrames()
    {
        await this.test('an animation without its own frames uses the object frame start and end', async () => {
            let idleKey = 'respawn-area-monsters-lvl-1-2_6_idle';
            let createdAnimations = ObjectAnimationsBuilder.build(this.enemyProps, {[idleKey]: {repeat: -1}});
            this.assert.deepStrictEqual(createdAnimations[idleKey].frames, {start: 12, end: 26});
        });
    }

    async testSingleFrameAnimationKeepsTheEndFrame()
    {
        await this.test('an animation ending on frame 0 keeps it instead of the object frame end', async () => {
            let stillKey = 'respawn-area-monsters-lvl-1-2_6_still';
            let createdAnimations = ObjectAnimationsBuilder.build(this.enemyProps, {[stillKey]: {start: 0, end: 0}});
            this.assert.deepStrictEqual(createdAnimations[stillKey].frames, {start: 0, end: 0});
        });
    }

    async testAnimationWithOnlyStartOrEndUsesTheObjectFrameForTheOther()
    {
        await this.test('an animation with only its start or only its end uses the object frame for the other one', async () => {
            let createdAnimations = ObjectAnimationsBuilder.build(this.enemyProps, {startOnly: {start: 3}, endOnly: {end: 5}});
            this.assert.deepStrictEqual(
                [createdAnimations.startOnly.frames, createdAnimations.endOnly.frames],
                [{start: 3, end: 26}, {start: 12, end: 5}]
            );
        });
    }

    async testAnimationOwnValuesOrTheObjectValues()
    {
        await this.test('an animation uses its own frame rate, repeat and hide on complete or the object ones', async () => {
            let objectProps = Object.assign({frameRate: 10, repeat: -1}, this.enemyProps);
            let createdAnimations = ObjectAnimationsBuilder.build(objectProps, {
                own: {start: 0, end: 2, frameRate: 8, repeat: 0, hideOnComplete: true},
                inherited: {start: 0, end: 2}
            });
            this.assert.deepStrictEqual(
                ['own', 'inherited'].map(key => [
                    createdAnimations[key].frameRate,
                    createdAnimations[key].repeat,
                    createdAnimations[key].hideOnComplete
                ]),
                [[8, 0, true], [10, -1, false]]
            );
        });
    }

    async testNotNumericRepeatRepeatsForever()
    {
        await this.test('an object repeat that is not numeric or missing repeats the animations forever', async () => {
            let textRepeat = ObjectAnimationsBuilder.build(Object.assign({repeat: 'abc'}, this.enemyProps), {walk: {start: 0, end: 2}});
            let missingRepeat = ObjectAnimationsBuilder.build(this.enemyProps, {walk: {start: 0, end: 2}});
            this.assert.deepStrictEqual([textRepeat.walk.repeat, missingRepeat.walk.repeat], [-1, -1]);
        });
    }

}

module.exports.TestAnimationEngine = TestAnimationEngine;
