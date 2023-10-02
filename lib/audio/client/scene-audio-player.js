/**
 *
 * Reldens - SceneAudioPlayer.
 *
 */

const { AudioConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class SceneAudioPlayer
{

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
            this.playSpriteAudio(sceneDynamic['associatedAudio'], sceneDynamic.key, audioManager);
            return sceneDynamic['associatedAudio'];
        }
        return false;
    }

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
                    let associatedAudio = this.attachAudioToSprite(sprite, event.key, audioManager, sceneDynamic);
                    if(associatedAudio !== false){
                        this.playSpriteAudio(associatedAudio, sceneDynamic.key, audioManager);
                    }
                });
                sprite.on('animationupdate', (event) => {
                    let animationKey = AudioConst.AUDIO_ANIMATION_KEY_UPDATE+event.key;
                    let associatedAudio = this.attachAudioToSprite(sprite, animationKey, audioManager, sceneDynamic);
                    if(associatedAudio !== false){
                        this.playSpriteAudio(associatedAudio, sceneDynamic.key, audioManager);
                    }
                });
                sprite.on('animationcomplete', (event) => {
                    let animationKey = AudioConst.AUDIO_ANIMATION_KEY_COMPLETE+event.key;
                    let associatedAudio = this.attachAudioToSprite(sprite, animationKey, audioManager, sceneDynamic);
                    if(associatedAudio !== false){
                        this.playSpriteAudio(associatedAudio, sceneDynamic.key, audioManager);
                    }
                });
                sprite.on('animationrepeat', (event) => {
                    let animationKey = AudioConst.AUDIO_ANIMATION_KEY_REPEAT+event.key;
                    let associatedAudio = this.attachAudioToSprite(sprite, animationKey, audioManager, sceneDynamic);
                    if(associatedAudio !== false){
                        this.playSpriteAudio(associatedAudio, sceneDynamic.key, audioManager);
                    }
                });
                sprite.on('animationstop', (event) => {
                    let animationKey = AudioConst.AUDIO_ANIMATION_KEY_STOP+event.key;
                    let associatedAudio = this.attachAudioToSprite(sprite, animationKey, audioManager, sceneDynamic);
                    if(associatedAudio !== false){
                        this.playSpriteAudio(associatedAudio, sceneDynamic.key, audioManager);
                    }
                });
            }
        });
    }

    attachAudioToSprite(sprite, animationAudioKey, audioManager, sceneDynamic)
    {
        if(!sc.hasOwn(sprite, 'associatedAudio')){
            sprite['associatedAudio'] = {};
        }
        if(!sc.hasOwn(sprite['associatedAudio'], animationAudioKey)){
            sprite['associatedAudio'][animationAudioKey] = audioManager.findAudio(animationAudioKey, sceneDynamic.key);
        }
        return sprite['associatedAudio'][animationAudioKey];
    }

    playSpriteAudio(associatedAudio, sceneKey, audioManager)
    {
        // @NOTE:
        // - We need the status update from the actual category in the audio manager (the category associated to the
        // audio here is just the storage reference.
        // - We need to check the category enable every time the audio could be reproduced because the user can turn
        // the category on/off at any time.
        if(!associatedAudio || !associatedAudio.audio || !associatedAudio.audio.data){
            Logger.error('Missing associated audio data.', associatedAudio);
            return false;
        }
        let audioCategoryKey = associatedAudio.audio.data.category.category_key;
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
            audioInstance.mute = false;
            audioInstance.play();
            return true;
        }
        // - if is not single category:
        if(!audioCategory.single_audio){
            // - if it does not have a marker we save the audio instance under the tree category_key > audio_key:
            if(!associatedAudio.marker){
                audioManager.playing[audioCategory.category_key][associatedAudio.audio.data.audio_key] = audioInstance;
                // and play the audio:
                audioInstance.mute = false;
                audioInstance.play();
                return true;
            }
            // - if it has a marker we save the audio instance under the tree category_key > marker_key:
            if(associatedAudio.marker){
                audioManager.playing[audioCategory.category_key][associatedAudio.marker] = audioInstance;
                // and play the audio passing the marker:
                audioInstance.mute = false;
                audioInstance.play(associatedAudio.marker);
                return true;
            }
        }
    }

}

module.exports.SceneAudioPlayer = new SceneAudioPlayer();
