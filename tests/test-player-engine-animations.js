/**
 *
 * Reldens - Test Player Engine Animations
 *
 * Tests the walk animation the player engine plays for a player state update: with basedOnPress on a sprite away from
 * its state plays the animation of the state direction, a sprite on the exact state position (no size offsets) skips
 * it (with the size offsets it is never skipped, ISSUE #348), and a dead or disabled player never plays one. The
 * position animation update without sprite, state or player id and the interpolation on with no entries return
 * without moving the sprite, and the update with the interpolation on only stores the entry of a shown player.
 *
 */

const { BaseTest } = require('./base-test');
const { PlayerEngine } = require('../lib/users/client/player-engine');
const { GameplayPlayerBuilder } = require('./fixtures/gameplay-player-builder');
const { GameConst } = require('../lib/game/constants');

class TestPlayerEngineAnimations extends BaseTest
{

    static AVATAR_KEY = 'e2e-avatar';
    static MAPPED_AVATAR = 'journeyman';

    createEngine(configValues)
    {
        return new PlayerEngine(GameplayPlayerBuilder.createPlayerEngineProps(
            {},
            TestPlayerEngineAnimations.AVATAR_KEY,
            GameplayPlayerBuilder.createConfig(Object.assign({'client/players/animations/basedOnPress': true}, configValues)),
            {[TestPlayerEngineAnimations.AVATAR_KEY]: TestPlayerEngineAnimations.MAPPED_AVATAR}
        ));
    }

    playAnimation(engine, spritePosition, playerState)
    {
        let played = [];
        let sprite = {
            x: spritePosition[0],
            y: spritePosition[1],
            avatarKey: TestPlayerEngineAnimations.AVATAR_KEY,
            anims: {play: (animationKey) => played.push(animationKey)}
        };
        engine.playPlayerAnimation(sprite, playerState, 'session-a');
        return played;
    }

    async testASpriteAwayFromItsStatePlaysTheStateDirection()
    {
        await this.test('a sprite away from its state plays the walk animation of the state direction', async () => {
            this.assert.deepStrictEqual(
                this.playAnimation(this.createEngine({}), [90, 100], {x: 100, y: 100, dir: GameConst.RIGHT}),
                [TestPlayerEngineAnimations.MAPPED_AVATAR+'_'+GameConst.RIGHT]
            );
        });
    }

    async testASpriteOnItsExactStateSkipsTheAnimation()
    {
        await this.test('a sprite on its exact state position skips the walk animation', async () => {
            this.assert.deepStrictEqual(
                this.playAnimation(this.createEngine({}), [100, 100], {x: 100, y: 100, dir: GameConst.RIGHT}),
                []
            );
        });
    }

    async testADeadOrDisabledPlayerPlaysNoAnimation()
    {
        await this.test('a dead or disabled player plays no walk animation', async () => {
            for(let inState of [GameConst.STATUS.DEATH, GameConst.STATUS.DISABLED]){
                this.assert.deepStrictEqual(
                    this.playAnimation(this.createEngine({}), [90, 100], {x: 100, y: 100, dir: GameConst.RIGHT, inState}),
                    []
                );
            }
        });
    }

    async testTheAnimationUpdateWithoutSpriteStateOrIdReturns()
    {
        await this.test('the position animation update without sprite, state or player id returns without moving', async () => {
            let engine = this.createEngine({});
            engine.scene = {clientInterpolation: false, interpolatePlayersPosition: {}};
            let sprite = {x: 90, y: 100};
            let state = {x: 100, y: 100, dir: GameConst.RIGHT};
            engine.processPlayerPositionAnimationUpdate(undefined, state, 'session-a', 100, 100);
            engine.processPlayerPositionAnimationUpdate(sprite, undefined, 'session-a', 100, 100);
            engine.processPlayerPositionAnimationUpdate(sprite, state, '', 100, 100);
            this.assert.deepStrictEqual([sprite.x, sprite.y], [90, 100]);
        });
    }

    async testTheInterpolationWithoutEntriesReturnsWithoutMoving()
    {
        await this.test('the interpolation on with no entries returns without moving the sprite', async () => {
            let engine = this.createEngine({});
            engine.scene = {clientInterpolation: true, interpolatePlayersPosition: {}};
            let sprite = {x: 90, y: 100};
            engine.processPlayerPositionAnimationUpdate(sprite, {x: 100, y: 100}, 'session-a', 100, 100);
            this.assert.deepStrictEqual([sprite.x, sprite.y], [90, 100]);
        });
    }

    async testTheUpdateStoresTheEntryWithoutMovingTheSprite()
    {
        await this.test('the update stores the interpolation entry of a shown player only and never moves its sprite', async () => {
            let engine = this.createEngine({});
            engine.scene = {clientInterpolation: true, interpolatePlayersPosition: {}};
            let sprite = {x: 90, y: 100};
            let player = {state: {x: 100, y: 100, dir: GameConst.RIGHT, mov: true}};
            engine.players = {'session-a': sprite};
            engine.updatePlayer('session-b', player);
            this.assert.deepStrictEqual(engine.scene.interpolatePlayersPosition, {});
            engine.updatePlayer('session-a', player);
            this.assert.deepStrictEqual(
                [engine.scene.interpolatePlayersPosition['session-a'], sprite.x, sprite.y],
                [player.state, 90, 100]
            );
        });
    }

}

module.exports.TestPlayerEngineAnimations = TestPlayerEngineAnimations;
