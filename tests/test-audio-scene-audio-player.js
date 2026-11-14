/**
 *
 * Reldens - Test Audio Scene Audio Player
 *
 * Tests the scene audio player with the sample audios: the room music played on entering a room and replaced on a scene
 * change (the single audio category stopping the previous music), a room without audio playing nothing, the footstep
 * markers played by the animations of the own player sprite, the onlyCurrentPlayer audio silent for the other players,
 * a dead or disabled own player and a disabled category playing nothing, and a muted state keeping the music to play it
 * after the unmute.
 *
 */

const { BaseTest } = require('./base-test');
const { AudioClientBuilder } = require('./fixtures/audio-client-builder');
const { SceneAudioPlayer } = require('../lib/audio/client/scene-audio-player');

class TestAudioSceneAudioPlayer extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.builder = new AudioClientBuilder();
        this.forestSceneKey = 'reldens-forest';
        this.stepMarkers = ['i_journeyman_right', 'r_journeyman_left'];
    }

    createSceneWithMusic(audioManager, sceneKey)
    {
        let music = this.builder.createLoadedAudio(sceneKey, this.builder.musicCategory, '', []);
        audioManager.roomsAudios[sceneKey] = {[sceneKey]: music};
        return {scene: {key: sceneKey}, music: music.audioInstance};
    }

    createStepsAudioManager(playerConfig)
    {
        let audioManager = this.builder.createAudioManager(playerConfig);
        let footstep = this.builder.createLoadedAudio('footstep', this.builder.soundCategory, {onlyCurrentPlayer: true}, this.stepMarkers);
        audioManager.globalAudios = {footstep};
        return {audioManager, steps: footstep.audioInstance};
    }

    createPlayerSprite(playerId)
    {
        let sprite = {type: 'Sprite', player_id: playerId, listeners: {}};
        sprite.on = (eventName, callback) => Object.assign(sprite.listeners, {[eventName]: callback});
        return sprite;
    }

    playStep(audioManager, scene, sprite)
    {
        return SceneAudioPlayer.playSpriteAudio(
            SceneAudioPlayer.attachAudioToSprite(sprite, this.stepMarkers[0], audioManager, scene),
            scene,
            sprite,
            audioManager
        );
    }

    async testTheRoomMusicPlaysAndIsReplacedOnASceneChange()
    {
        await this.test('the room music plays on entering the room and a scene change stops it and plays the new one', async () => {
            let audioManager = this.builder.createAudioManager({});
            let town = this.createSceneWithMusic(audioManager, this.builder.townSceneKey);
            let forest = this.createSceneWithMusic(audioManager, this.forestSceneKey);
            SceneAudioPlayer.playSceneAudio(audioManager, town.scene);
            let townPlayed = [...town.music.played];
            SceneAudioPlayer.playSceneAudio(audioManager, forest.scene);
            this.assert.deepStrictEqual(
                [townPlayed, town.music.stops, forest.music.played, audioManager.playing.music === forest.music],
                [[this.builder.townSceneKey], 1, [this.forestSceneKey], true]
            );
        });
    }

    async testARoomWithoutAudioPlaysNothing()
    {
        await this.test('a room without audio plays nothing and keeps no scene audio', async () => {
            let audioManager = this.builder.createAudioManager({});
            let silentScene = {key: 'reldens-house-1'};
            this.assert.deepStrictEqual(
                [SceneAudioPlayer.playSceneAudio(audioManager, silentScene), silentScene.associatedAudio, audioManager.playing],
                [false, false, {music: {}, sound: {}}]
            );
        });
    }

    async testTheAnimationsPlayTheirFootstepMarkers()
    {
        await this.test('the own player animations start and repeat play only their footstep markers', async () => {
            let {audioManager, steps} = this.createStepsAudioManager({});
            let ownSprite = this.createPlayerSprite(this.builder.currentPlayerId);
            let fadeIn = {};
            let scene = {
                key: this.builder.townSceneKey,
                children: {list: [ownSprite, {type: 'Image'}]},
                cameras: {main: {on: (eventName, callback) => Object.assign(fadeIn, {[eventName]: callback})}}
            };
            SceneAudioPlayer.associateSceneAnimationsAudios(audioManager, scene);
            fadeIn.camerafadeincomplete();
            ownSprite.listeners.animationstart({key: 'journeyman_right'});
            ownSprite.listeners.animationrepeat({key: 'journeyman_left'});
            ownSprite.listeners.animationcomplete({key: 'journeyman_right'});
            this.assert.deepStrictEqual(
                [Object.keys(ownSprite.listeners), steps.played, Object.keys(audioManager.playing.sound)],
                [
                    ['animationstart', 'animationupdate', 'animationcomplete', 'animationrepeat', 'animationstop'],
                    this.stepMarkers,
                    this.stepMarkers
                ]
            );
        });
    }

    async testTheOwnPlayerOnlyAudioIsSilentForTheOtherPlayers()
    {
        await this.test('an onlyCurrentPlayer audio is silent for the other players sprites', async () => {
            let {audioManager, steps} = this.createStepsAudioManager({});
            let scene = {key: this.builder.townSceneKey};
            this.assert.deepStrictEqual(
                [
                    this.playStep(audioManager, scene, this.createPlayerSprite(this.builder.currentPlayerId + 1)),
                    this.playStep(audioManager, scene, this.createPlayerSprite(this.builder.currentPlayerId)),
                    steps.played
                ],
                [false, true, [this.stepMarkers[0]]]
            );
        });
    }

    async testADeadOrDisabledOwnPlayerAndADisabledCategoryPlayNothing()
    {
        await this.test('a dead or disabled own player and a disabled category play no audio', async () => {
            let results = [];
            for(let [isDeath, isDisabled] of [[true, false], [false, true]]){
                let {audioManager, steps} = this.createStepsAudioManager({});
                let scene = {key: this.builder.townSceneKey, player: {isDeath: () => isDeath, isDisabled: () => isDisabled}};
                results.push([this.playStep(audioManager, scene, this.createPlayerSprite(this.builder.currentPlayerId)), steps.played]);
            }
            let disabledSound = this.createStepsAudioManager({[this.builder.soundCategory.id]: 0});
            results.push([
                this.playStep(disabledSound.audioManager, {key: this.builder.townSceneKey}, this.createPlayerSprite(this.builder.currentPlayerId)),
                disabledSound.steps.played
            ]);
            this.assert.deepStrictEqual(results, [[false, []], [false, []], [false, []]]);
        });
    }

    async testAMutedStateKeepsTheMusicForTheUnmute()
    {
        await this.test('a muted state keeps the room music without playing it and the unmute plays it', async () => {
            let audioManager = this.builder.createAudioManager({});
            let town = this.createSceneWithMusic(audioManager, this.builder.townSceneKey);
            audioManager.currentMuteState = true;
            SceneAudioPlayer.playSceneAudio(audioManager, town.scene);
            let whileMuted = [[...town.music.played], audioManager.playing.music === town.music, {...audioManager.changedMutedState}];
            await audioManager.changeMuteState(false);
            this.assert.deepStrictEqual(
                [whileMuted, town.music.played],
                [[[], true, {music: true}], [this.builder.townSceneKey]]
            );
        });
    }

}

module.exports.TestAudioSceneAudioPlayer = TestAudioSceneAudioPlayer;
