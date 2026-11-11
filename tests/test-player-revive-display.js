/**
 *
 * Reldens - Test Player Revive Display
 *
 */

const { BaseTest } = require('./base-test');
const { PlayerReviveDisplay } = require('../lib/game/client/player-revive-display');
const { Battle } = require('../lib/actions/server/battle');
const { GameConst } = require('../lib/game/constants');

class TestPlayerReviveDisplay extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.ownPlayerId = 'own-session';
        this.otherPlayerId = 'other-session';
        this.leftOff = 3;
        this.topOff = 20;
    }

    createSetup(hasAnimation = true)
    {
        let setup = {closedBoxes: [], createdSprites: [], completeCallbacks: []};
        setup.players = {
            [this.ownPlayerId]: {x: 10, y: 20, visible: false, nameSprite: {visible: false}},
            [this.otherPlayerId]: {x: 30, y: 40, visible: false, nameSprite: {visible: false}}
        };
        setup.currentPlayer = {
            playerId: this.ownPlayerId,
            players: setup.players,
            leftOff: this.leftOff,
            topOff: this.topOff
        };
        setup.gameManager = {
            getCurrentPlayer: () => setup.currentPlayer,
            gameDom: {
                getElement: (selector) => ({classList: {add: (className) => setup.closedBoxes.push({selector, className})}})
            }
        };
        setup.scene = {
            stopOnDeathOrDisabledSent: true,
            getAnimationByKey: () => hasAnimation,
            physics: {add: {sprite: (x, y, key) => this.createAnimationSprite(setup, x, y, key)}}
        };
        return setup;
    }

    createAnimationSprite(setup, x, y, key)
    {
        let animationSprite = {x, y, key, playedKeys: [], destroyed: false};
        animationSprite.setDepth = (depth) => animationSprite.depth = depth;
        animationSprite.destroy = () => animationSprite.destroyed = true;
        animationSprite.anims = {
            play: (playedKey) => {
                animationSprite.playedKeys.push(playedKey);
                return {on: (eventKey, callback) => setup.completeCallbacks.push({eventKey, callback})};
            }
        };
        setup.createdSprites.push(animationSprite);
        return animationSprite;
    }

    show(setup, message)
    {
        return PlayerReviveDisplay.show(
            Object.assign({act: GameConst.REVIVED}, message),
            setup.gameManager,
            setup.scene
        );
    }

    assertBoxKeptOpen(setup)
    {
        this.assert.deepStrictEqual(setup.closedBoxes, []);
        this.assert.strictEqual(setup.scene.stopOnDeathOrDisabledSent, true);
    }

    assertOwnBoxClosed(setup)
    {
        this.assert.deepStrictEqual(
            setup.closedBoxes,
            [{selector: PlayerReviveDisplay.GAME_OVER_SELECTOR, className: 'hidden'}]
        );
        this.assert.strictEqual(setup.scene.stopOnDeathOrDisabledSent, false);
    }

    assertAnimationPlayed(setup, x, y)
    {
        this.assert.strictEqual(setup.createdSprites.length, 1);
        let animationSprite = [...setup.createdSprites].shift();
        this.assert.strictEqual(animationSprite.x, x);
        this.assert.strictEqual(animationSprite.y, y);
        this.assert.strictEqual(animationSprite.key, PlayerReviveDisplay.ANIMATION_KEY);
        this.assert.strictEqual(animationSprite.depth, PlayerReviveDisplay.ANIMATION_DEPTH);
        this.assert.deepStrictEqual(animationSprite.playedKeys, [PlayerReviveDisplay.ANIMATION_KEY]);
    }

    async testOwnReviveClosesTheGameOverBox()
    {
        await this.test('the revived player closes its game over box, is shown and plays the animation', async () => {
            let setup = this.createSetup();
            this.assert.strictEqual(this.show(setup, {t: this.ownPlayerId, x: 100, y: 200}), true);
            this.assertOwnBoxClosed(setup);
            this.assert.strictEqual(setup.players[this.ownPlayerId].visible, true);
            this.assert.strictEqual(setup.players[this.ownPlayerId].nameSprite.visible, true);
            this.assert.strictEqual(setup.players[this.otherPlayerId].visible, false);
            this.assertAnimationPlayed(setup, 100 - this.leftOff, 200 - this.topOff);
            let animationSprite = [...setup.createdSprites].shift();
            let completeListener = [...setup.completeCallbacks].shift();
            this.assert.strictEqual(animationSprite.destroyed, false);
            this.assert.strictEqual(completeListener.eventKey, 'animationcomplete');
            completeListener.callback();
            this.assert.strictEqual(animationSprite.destroyed, true);
        });
    }

    async testOtherPlayerReviveKeepsTheGameOverBoxOpen()
    {
        await this.test('another player revive keeps this client box open and shows that player', async () => {
            let setup = this.createSetup();
            this.assert.strictEqual(this.show(setup, {t: this.otherPlayerId, x: 300, y: 400}), true);
            this.assertBoxKeptOpen(setup);
            this.assert.strictEqual(setup.players[this.otherPlayerId].visible, true);
            this.assert.strictEqual(setup.players[this.otherPlayerId].nameSprite.visible, true);
            this.assert.strictEqual(setup.players[this.ownPlayerId].visible, false);
            this.assertAnimationPlayed(setup, 300 - this.leftOff, 400 - this.topOff);
        });
    }

    async testMessageWithoutPositionUsesTheSprite()
    {
        await this.test('a revive message without position plays the animation on the player sprite', async () => {
            let setup = this.createSetup();
            this.assert.strictEqual(this.show(setup, {t: this.ownPlayerId}), true);
            this.assertAnimationPlayed(setup, 10, 20);
        });
    }

    async testUnknownPlayerShowsNothing()
    {
        await this.test('a revive of a player without sprite shows nothing and keeps the box open', async () => {
            let setup = this.createSetup();
            this.assert.strictEqual(this.show(setup, {t: 'unknown-session'}), false);
            this.assertBoxKeptOpen(setup);
            this.assert.deepStrictEqual(setup.createdSprites, []);
        });
    }

    async testOwnReviveWithoutSpriteStillClosesTheBox()
    {
        await this.test('the own revive closes the box even when its sprite is not available', async () => {
            let setup = this.createSetup();
            delete setup.players[this.ownPlayerId];
            this.assert.strictEqual(this.show(setup, {t: this.ownPlayerId}), false);
            this.assertOwnBoxClosed(setup);
            this.assert.deepStrictEqual(setup.createdSprites, []);
        });
    }

    async testMissingAnimationStillShowsThePlayer()
    {
        await this.test('a missing revive animation still shows the player and closes its box', async () => {
            let setup = this.createSetup(false);
            this.assert.strictEqual(this.show(setup, {t: this.ownPlayerId, x: 1, y: 2}), false);
            this.assertOwnBoxClosed(setup);
            this.assert.strictEqual(setup.players[this.ownPlayerId].visible, true);
            this.assert.deepStrictEqual(setup.createdSprites, []);
        });
    }

    async testSpriteWithoutNameIsShown()
    {
        await this.test('a player sprite without a name sprite is shown', async () => {
            let setup = this.createSetup();
            delete setup.players[this.otherPlayerId].nameSprite;
            this.assert.strictEqual(this.show(setup, {t: this.otherPlayerId, x: 5, y: 6}), true);
            this.assert.strictEqual(setup.players[this.otherPlayerId].visible, true);
        });
    }

    async testMissingCurrentPlayerDoesNothing()
    {
        await this.test('a revive received before the current player exists does nothing', async () => {
            let setup = this.createSetup();
            setup.currentPlayer = false;
            this.assert.strictEqual(this.show(setup, {t: this.ownPlayerId}), false);
            this.assertBoxKeptOpen(setup);
            this.assert.deepStrictEqual(setup.createdSprites, []);
        });
    }

    async testBattleBroadcastsTheRevivePosition()
    {
        await this.test('the battle revive broadcasts where, restores the player and keeps its body out of the removal queue', async () => {
            let broadcasts = [];
            let addedBodies = [];
            let activatedStates = [];
            let body = {id: 'player-body'};
            let otherBody = {id: 'bullet-body'};
            let targetSchema = {sessionId: 'revived', state: {x: 70, y: 80}, stats: {hp: 0}, statsBase: {hp: 100}};
            let room = {
                roomWorld: {removeBodies: [body, otherBody], addBody: (addedBody) => addedBodies.push(addedBody)},
                activePlayerBySessionId: () => true,
                activatePlayer: (playerSchema, newState) => activatedStates.push(newState),
                savePlayerStats: async () => true,
                broadcast: (client, message) => broadcasts.push(message)
            };
            let battle = new Battle({events: {}});
            this.assert.strictEqual(await battle.revivePlayer(room, body, targetSchema, 'hp', {}), true);
            this.assert.deepStrictEqual(broadcasts, [{act: GameConst.REVIVED, t: 'revived', x: 70, y: 80}]);
            this.assert.deepStrictEqual(addedBodies, [body]);
            this.assert.deepStrictEqual(room.roomWorld.removeBodies, [otherBody]);
            this.assert.deepStrictEqual(activatedStates, [GameConst.STATUS.ACTIVE]);
            this.assert.strictEqual(targetSchema.stats.hp, 100);
        });
    }

}

module.exports.TestPlayerReviveDisplay = TestPlayerReviveDisplay;
