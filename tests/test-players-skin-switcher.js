/**
 *
 * Reldens - Test Players Skin Switcher
 *
 */

const { BaseTest } = require('./base-test');
const { PlayersSkinSwitcher } = require('../lib/users/client/players-skin-switcher');

class TestPlayersSkinSwitcher extends BaseTest
{

    createPlayerSprite(avatarKey)
    {
        let playerSprite = {avatarKey, textures: []};
        playerSprite.setTexture = (textureKey) => playerSprite.textures.push(textureKey);
        return playerSprite;
    }

    createPlayerEngine(playerId, playersAvatars)
    {
        let playerEngine = {playerId, avatarKey: playersAvatars[playerId], players: {}, room: {state: {players: {}}}};
        let statePlayers = {};
        for(let playerKey of Object.keys(playersAvatars)){
            playerEngine.players[playerKey] = this.createPlayerSprite(playersAvatars[playerKey]);
            statePlayers[playerKey] = {avatarKey: playersAvatars[playerKey]};
        }
        playerEngine.room.state.players.get = (playerKey) => statePlayers[playerKey];
        playerEngine.statePlayers = statePlayers;
        return playerEngine;
    }

    createSwitcher()
    {
        return new PlayersSkinSwitcher({gameManager: {mappedAvatars: {journeyman: 'journeyman', warlock: 'warlock'}}});
    }

    async testOwnPlayerSkinSwitchesTheSpriteAndTheEngineAvatar()
    {
        await this.test('the own player skin switches the sprite texture and the engine avatar', async () => {
            let playerEngine = this.createPlayerEngine('session-7', {'session-7': 'journeyman'});
            this.assert.strictEqual(this.createSwitcher().switchSkin(playerEngine, 'session-7', 'warlock'), true);
            this.assert.deepStrictEqual(playerEngine.players['session-7'].textures, ['warlock']);
            this.assert.strictEqual(playerEngine.players['session-7'].avatarKey, 'warlock');
            this.assert.strictEqual(playerEngine.avatarKey, 'warlock');
        });
    }

    async testOtherPlayerSkinKeepsTheEngineAvatar()
    {
        await this.test('another player skin switches its sprite and keeps the engine avatar', async () => {
            let playersAvatars = {'session-7': 'journeyman', 'session-8': 'journeyman'};
            let playerEngine = this.createPlayerEngine('session-7', playersAvatars);
            this.assert.strictEqual(this.createSwitcher().switchSkin(playerEngine, 'session-8', 'warlock'), true);
            this.assert.deepStrictEqual(playerEngine.players['session-8'].textures, ['warlock']);
            this.assert.deepStrictEqual(playerEngine.players['session-7'].textures, []);
            this.assert.strictEqual(playerEngine.avatarKey, 'journeyman');
        });
    }

    async testMissingSpriteSameOrUnmappedSkinChangesNothing()
    {
        await this.test('a missing sprite, the same avatar or an unmapped skin changes nothing', async () => {
            let switcher = this.createSwitcher();
            let playerEngine = this.createPlayerEngine('session-7', {'session-7': 'journeyman'});
            this.assert.strictEqual(switcher.switchSkin(playerEngine, 'session-9', 'warlock'), false);
            this.assert.strictEqual(switcher.switchSkin(playerEngine, 'session-7', 'journeyman'), false);
            this.assert.strictEqual(switcher.switchSkin(playerEngine, 'session-7', 'paladin'), false);
            this.assert.strictEqual(switcher.switchSkin(false, 'session-7', 'warlock'), false);
            this.assert.deepStrictEqual(playerEngine.players['session-7'].textures, []);
            this.assert.strictEqual(playerEngine.avatarKey, 'journeyman');
        });
    }

    async testAddedPlayerGetsItsStateSkin()
    {
        await this.test('a sprite added after a skin change gets the skin of its player state', async () => {
            let switcher = this.createSwitcher();
            let playersAvatars = {'session-7': 'journeyman', 'session-8': 'journeyman'};
            let playerEngine = this.createPlayerEngine('session-7', playersAvatars);
            playerEngine.statePlayers['session-8'].avatarKey = 'warlock';
            this.assert.strictEqual(switcher.syncAddedPlayer(playerEngine, 'session-8'), true);
            this.assert.deepStrictEqual(playerEngine.players['session-8'].textures, ['warlock']);
            this.assert.strictEqual(switcher.syncAddedPlayer(playerEngine, 'session-9'), false);
            this.assert.strictEqual(switcher.syncAddedPlayer(false, 'session-8'), false);
        });
    }

}

module.exports.TestPlayersSkinSwitcher = TestPlayersSkinSwitcher;
