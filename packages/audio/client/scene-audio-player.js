/**
 *
 * Reldens - SceneAudioPlayer.
 *
 */

const { AudioConst } = require('../constants');
const { sc } = require('@reldens/utils');

class SceneAudioPlayer
{

    playSceneAudio(audioManager, sceneDynamic)
    {
        if(
            sceneDynamic['associatedAudio'] === false
            || (sceneDynamic['associatedAudio'] && sceneDynamic['associatedAudio'].audio.audioInstance.isPlaying)
        ){
            return false;
        }
        sceneDynamic['associatedAudio'] = audioManager.findAudio(sceneDynamic.key, sceneDynamic.key);
        if(sceneDynamic['associatedAudio']){
            this.playSpriteAudio(sceneDynamic['associatedAudio'], sceneDynamic.key, audioManager);
            return sceneDynamic['associatedAudio'];
        }
        return true;
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
                sprite.on('animationstart', (a) => {
                    let associatedAudio = this.attachAudioToSprite(sprite, a.key, audioManager, sceneDynamic);
                    if(associatedAudio !== false){
                        this.playSpriteAudio(associatedAudio, sceneDynamic.key, audioManager);
                    }
                });
                sprite.on('animationupdate', (a) => {
                    let animationKey = AudioConst.AUDIO_ANIMATION_KEY_UPDATE+a.key;
                    let associatedAudio = this.attachAudioToSprite(sprite, animationKey, audioManager, sceneDynamic);
                    if(associatedAudio !== false){
                        this.playSpriteAudio(associatedAudio, sceneDynamic.key, audioManager);
                    }
                });
                sprite.on('animationcomplete', (a) => {
                    let animationKey = AudioConst.AUDIO_ANIMATION_KEY_COMPLETE+a.key;
                    let associatedAudio = this.attachAudioToSprite(sprite, animationKey, audioManager, sceneDynamic);
                    if(associatedAudio !== false){
                        this.playSpriteAudio(associatedAudio, sceneDynamic.key, audioManager);
                    }
                });
                sprite.on('animationrepeat', (a) => {
                    let animationKey = AudioConst.AUDIO_ANIMATION_KEY_REPEAT+a.key;
                    let associatedAudio = this.attachAudioToSprite(sprite, animationKey, audioManager, sceneDynamic);
                    if(associatedAudio !== false){
                        this.playSpriteAudio(associatedAudio, sceneDynamic.key, audioManager);
                    }
                });
                sprite.on('animationstop', (a) => {
                    let animationKey = AudioConst.AUDIO_ANIMATION_KEY_STOP+a.key;
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
        if(sprite['associatedAudio'][animationAudioKey] === false){
            return false;
        }
        sprite['associatedAudio'][animationAudioKey] = audioManager.findAudio(animationAudioKey, sceneDynamic.key);
        if(sprite['associatedAudio'][animationAudioKey] === false){
            return false;
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
        let audioCategoryKey = associatedAudio.audio.data.category.category_key;
        let audioCategory = sc.getDef(audioManager.categories, audioCategoryKey, false);
        let audioEnabled = sc.getDef(audioManager.playerConfig, audioCategory.id, audioCategory.enabled);
        if(!audioCategory || !audioEnabled){
            return false;
        }
        let audioInstance = associatedAudio.audio.audioInstance;
        // first stop previous if is single category audio:
        if(audioCategory.single_audio){
            if(typeof audioManager.playing[audioCategory.category_key].stop === 'function'){
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
            if(!associatedAudio.marker) {
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
