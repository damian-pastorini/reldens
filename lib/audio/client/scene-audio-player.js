/**
 *
 * Reldens - SceneAudioPlayer.
 *
 * Handles audio playback for scenes and sprite animations in the game.
 *
 */

const { AudioConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('./manager').AudioManager} AudioManager
 * @typedef {import('phaser').Scene} PhaserScene
 * @typedef {import('phaser').GameObjects.Sprite} PhaserSprite
 */
class SceneAudioPlayer
{

    /**
     * @param {AudioManager} audioManager
     * @param {PhaserScene} sceneDynamic
     * @param {boolean} [forcePlay]
     * @returns {Object|boolean}
     */
    playSceneAudio(audioManager, sceneDynamic, forcePlay)
    {
        let sceneAudio = sceneDynamic['associatedAudio'];
        if(
            forcePlay !== true
            && (sceneAudio === false || (sceneAudio && sceneAudio.audio.audioInstance.isPlaying))
        ){
            return false;
        }
        sceneDynamic['associatedAudio'] = audioManager.findAudio(sceneDynamic.key, sceneDynamic.key);
        if(sceneDynamic['associatedAudio']){
            this.playSpriteAudio(sceneDynamic['associatedAudio'], sceneDynamic, false, audioManager);
            return sceneDynamic['associatedAudio'];
        }
        return false;
    }

    /**
     * @param {AudioManager} audioManager
     * @param {PhaserScene} sceneDynamic
     */
    associateSceneAnimationsAudios(audioManager, sceneDynamic)
    {
        sceneDynamic.cameras.main.on('camerafadeincomplete', () => {
            if(sceneDynamic.children.list.length <= 0){
                return false;
            }
            for(let sprite of sceneDynamic.children.list){
                if(sprite.type !== 'Sprite'){
                    continue;
                }
                sprite.on('animationstart', (event) => {
                    let animationKey = AudioConst.AUDIO_ANIMATION_KEY_START+event.key;
                    let associatedAudio = this.attachAudioToSprite(sprite, animationKey, audioManager, sceneDynamic);
                    //Logger.debug('Animation start audio:', animationKey, associatedAudio);
                    if(false !== associatedAudio){
                        this.playSpriteAudio(associatedAudio, sceneDynamic, sprite, audioManager);
                    }
                });
                sprite.on('animationupdate', (event) => {
                    let animationKey = AudioConst.AUDIO_ANIMATION_KEY_UPDATE+event.key;
                    let associatedAudio = this.attachAudioToSprite(sprite, animationKey, audioManager, sceneDynamic);
                    //Logger.debug('Animation update audio:', animationKey, associatedAudio);
                    if(false !== associatedAudio){
                        this.playSpriteAudio(associatedAudio, sceneDynamic, sprite, audioManager);
                    }
                });
                sprite.on('animationcomplete', (event) => {
                    let animationKey = AudioConst.AUDIO_ANIMATION_KEY_COMPLETE+event.key;
                    let associatedAudio = this.attachAudioToSprite(sprite, animationKey, audioManager, sceneDynamic);
                    //Logger.debug('Animation complete audio:', animationKey, associatedAudio);
                    if(false !== associatedAudio){
                        this.playSpriteAudio(associatedAudio, sceneDynamic, sprite, audioManager);
                    }
                });
                sprite.on('animationrepeat', (event) => {
                    let animationKey = AudioConst.AUDIO_ANIMATION_KEY_REPEAT+event.key;
                    let associatedAudio = this.attachAudioToSprite(sprite, animationKey, audioManager, sceneDynamic);
                    //Logger.debug('Animation repeat audio:', animationKey, associatedAudio);
                    if(false !== associatedAudio){
                        this.playSpriteAudio(associatedAudio, sceneDynamic, sprite, audioManager);
                    }
                });
                sprite.on('animationstop', (event) => {
                    let animationKey = AudioConst.AUDIO_ANIMATION_KEY_STOP+event.key;
                    let associatedAudio = this.attachAudioToSprite(sprite, animationKey, audioManager, sceneDynamic);
                    //Logger.debug('Animation stop audio:', animationKey, associatedAudio);
                    if(false !== associatedAudio){
                        this.playSpriteAudio(associatedAudio, sceneDynamic, sprite, audioManager);
                    }
                });
            }
        });
    }

    /**
     * @param {PhaserSprite} sprite
     * @param {string} animationAudioKey
     * @param {AudioManager} audioManager
     * @param {PhaserScene} sceneDynamic
     * @returns {Object|boolean}
     */
    attachAudioToSprite(sprite, animationAudioKey, audioManager, sceneDynamic)
    {
        if(sc.hasOwn(sprite.associatedAudio, animationAudioKey)){
            return sprite.associatedAudio[animationAudioKey];
        }
        if(!sc.hasOwn(sprite, 'associatedAudio')){
            sprite.associatedAudio = {};
        }
        if(!sc.hasOwn(sprite.associatedAudio, animationAudioKey)){
            sprite.associatedAudio[animationAudioKey] = audioManager.findAudio(animationAudioKey, sceneDynamic.key);
        }
        return sprite.associatedAudio[animationAudioKey];
    }

    /**
     * @param {Object} associatedAudio
     * @param {PhaserScene} sceneDynamic
     * @param {PhaserSprite|boolean} sprite
     * @param {AudioManager} audioManager
     * @returns {boolean}
     */
    playSpriteAudio(associatedAudio, sceneDynamic, sprite, audioManager)
    {
        let currentPlayerId = Number(audioManager.currentPlayerData.id);
        let spritePlayerId = Number(sc.get(sprite, 'player_id'));
        //Logger.debug('Play sprite audio.', associatedAudio, sceneDynamic.key, sprite, currentPlayerId);
        let isCurrentPlayerSprite = this.isCurrentPlayerSprite(spritePlayerId, currentPlayerId);
        if(associatedAudio.audio.data.config?.onlyCurrentPlayer && !isCurrentPlayerSprite){
            //Logger.debug('Play sprite audio avoided for current player.', associatedAudio, sceneKey);
            return false;
        }
        let currentPlayer = sceneDynamic.player;
        if(isCurrentPlayerSprite && currentPlayer && (currentPlayer.isDisabled() || currentPlayer.isDeath())){
            //Logger.debug('Play sprite audio avoided for current dead player.', associatedAudio, sceneKey);
            return false;
        }
        // @NOTE:
        // - We need the status update from the actual category in the audio manager the category associated with the
        // audio here is just the storage reference.
        // - We need to check the category enabled every time the audio can be reproduced because the user can turn
        // the category on/off at any time.
        if(!associatedAudio || !associatedAudio.audio || !associatedAudio.audio.data){
            Logger.error('Missing associated audio data.', associatedAudio);
            return false;
        }
        let audioCategoryKey = associatedAudio.audio.data.related_audio_categories.category_key;
        let audioCategory = sc.get(audioManager.categories, audioCategoryKey, false);
        let audioEnabled = sc.get(audioManager.playerConfig, audioCategory.id, audioCategory.enabled);
        if(!audioCategory || !audioEnabled){
            return false;
        }
        let audioInstance = associatedAudio.audio.audioInstance;
        // first stop previous if is single category audio:
        if(audioCategory.single_audio){
            if(sc.isObjectFunction(audioManager.playing[audioCategory.category_key], 'stop')){
                audioManager.playing[audioCategory.category_key].stop();
            }
        }
        // save the new instance in the proper place and play:
        // - if is single category then just in the playing property with that category key:
        if(audioCategory.single_audio){
            audioManager.playing[audioCategory.category_key] = audioInstance;
            if(this.isMutedState(audioManager, audioCategory.category_key, audioInstance)){
                return false;
            }
            audioInstance.mute = false;
            audioInstance.play();
            return true;
        }
        // - if is not single category:
        if(!audioCategory.single_audio){
            // - if it does not have a marker, we save the audio instance under the tree category_key > audio_key:
            if(!associatedAudio.marker){
                audioManager.playing[audioCategory.category_key][associatedAudio.audio.data.audio_key] = audioInstance;
                if(this.isMutedState(audioManager, audioCategory.category_key, audioInstance)){
                    return false;
                }
                // and play the audio:
                audioInstance.mute = false;
                audioInstance.play();
                return true;
            }
            // - if it has a marker, we save the audio instance under the tree category_key > marker_key:
            if(associatedAudio.marker){
                audioManager.playing[audioCategory.category_key][associatedAudio.marker] = audioInstance;
                if(this.isMutedState(audioManager, audioCategory.category_key, audioInstance)){
                    return false;
                }
                // and play the audio passing the marker:
                audioInstance.mute = false;
                audioInstance.play(associatedAudio.marker);
                return true;
            }
        }
    }

    /**
     * @param {number} spritePlayerId
     * @param {number} currentPlayerId
     * @returns {boolean}
     */
    isCurrentPlayerSprite(spritePlayerId, currentPlayerId)
    {
        return spritePlayerId && spritePlayerId === currentPlayerId;
    }

    /**
     * @param {AudioManager} audioManager
     * @param {string} mutedKey
     * @param {Object} audioInstance
     * @returns {boolean}
     */
    isMutedState(audioManager, mutedKey, audioInstance)
    {
        if(false === audioManager.currentMuteState){
            return false;
        }
        Logger.info('AudioManager in muted state to play audio.', {mutedKey, audioInstance});
        audioManager.changedMutedState[mutedKey] = audioManager.currentMuteState;
        return true;
    }

}

module.exports.SceneAudioPlayer = new SceneAudioPlayer();
