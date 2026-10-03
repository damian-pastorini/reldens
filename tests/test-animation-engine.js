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

}

module.exports.TestAnimationEngine = TestAnimationEngine;
