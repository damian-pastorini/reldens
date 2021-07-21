/**
 *
 * Reldens - Audio Manager
 *
 */

const { sc } = require('@reldens/utils');

class AudioManager
{

    constructor(props)
    {
        this.globalAudios = sc.getDef(props, 'globalAudios', {});
        this.roomsAudios = sc.getDef(props, 'roomsAudios', {});
        this.categories = sc.getDef(props, 'categories', {});
        this.playing = {};
        this.defaultAudioConfig = {
            mute: false,
            volume: 1,
            rate: 1,
            detune: 0,
            seek: 0,
            loop: true,
            delay: 0
        };
    }

    setAudio(audioType, enabled)
    {
        let isEnabled = Boolean(enabled);
        this.categories[audioType].enabled = isEnabled;
        if(!sc.hasOwn(this.playing, audioType)){
            return true;
        }
        let playOrStop = isEnabled ? 'play' : 'stop';
        // if is single track we will stop or play the last audio:
        if(this.categories[audioType].single_audio && typeof this.playing[audioType].stop === 'function'){
            this.playing[audioType][playOrStop]();
            this.playing[audioType].mute = !isEnabled;
            return true;
        }
        // if is multi-track we will only stop all the audios but replay them only when the events require it:
        let audioTypesKeys = Object.keys(this.playing[audioType]);
        if(!this.categories[audioType].single_audio && audioTypesKeys.length){
            for(let i of audioTypesKeys){
                let playingAudio = this.playing[audioType][i];
                if(playingAudio && typeof playingAudio.stop === 'function'){
                    if(!isEnabled){
                        playingAudio.stop();
                    }
                    playingAudio.mute = !isEnabled;
                }
            }
            return true
        }
        return false;
    }

    loadGlobalAudios(onScene, audiosDataCollection)
    {
        for(let audio of audiosDataCollection){
            let filesName = audio.files_name.split(',');
            let filesArr = [];
            for(let fileName of filesName){
                filesArr.push('assets/audio/'+fileName);
            }
            onScene.load.audio(audio.audio_key, filesArr);
        }
    }

    generateAudios(onScene, audiosDataCollection)
    {
        let generatedAudios = {};
        for(let audio of audiosDataCollection){
            generatedAudios[audio.audio_key] = this.generateAudio(onScene, audio);
        }
        return generatedAudios;
    }

    generateAudio(onScene, audio)
    {
        let soundConfig = Object.assign({}, this.defaultAudioConfig, (audio.config || {}));
        let audioInstance = onScene.sound.add(audio.audio_key, soundConfig);
        if(audio.markers.length){
            for(let marker of audio.markers){
                let markerConfig = Object.assign({}, soundConfig, (marker.config || {}), {
                    name: marker.marker_key,
                    start: marker.start,
                    duration: marker.duration,
                });
                audioInstance.addMarker(markerConfig);
            }
        }
        return {data: audio, audioInstance};
    }

    findAudio(audioKey, sceneKey)
    {
        let roomAudio = this.findRoomAudio(audioKey, sceneKey);
        return roomAudio ? roomAudio : this.findGlobalAudio(audioKey);
    }

    findRoomAudio(audioKey, sceneKey)
    {
        if(!sc.hasOwn(this.roomsAudios, sceneKey)){
            this.roomsAudios[sceneKey] = {};
        }
        return this.findAudioInObjectKey(audioKey, this.roomsAudios[sceneKey]);
    }

    findGlobalAudio(audioKey)
    {
        return this.findAudioInObjectKey(audioKey, this.globalAudios);
    }

    findAudioInObjectKey(audioKey, audiosObject)
    {
        let objectKeys = Object.keys(audiosObject);
        if(sc.hasOwn(audiosObject, audioKey)){
            return {audio: audiosObject[audioKey], marker: false};
        }
        if(objectKeys.length){
            for(let i of objectKeys){
                let audio = audiosObject[i];
                if(sc.hasOwn(audio.audioInstance.markers, audioKey)){
                    return {audio, marker: audioKey};
                }
            }
        }
        return false;
    }

    addCategories(categories)
    {
        for(let category of categories){
            if(!sc.hasOwn(this.categories, category.category_key)){
                this.categories[category.category_key] = category;
            }
            if(!sc.hasOwn(this.playing, category.category_key)){
                this.playing[category.category_key] = {};
            }
        }
    }

    loadAudiosInScene(audios, currentScene)
    {
        let newAudiosCounter = 0;
        for(let audio of audios){
            if(this.audioExistsInScene(audio.audio_key, currentScene)){
                continue;
            }
            let filesName = audio.files_name.split(',');
            let filesArr = [];
            for(let fileName of filesName){
                filesArr.push('assets/audio/'+fileName);
            }
            currentScene.load.audio(audio.audio_key, filesArr).once('complete', () => {
                if(!sc.hasOwn(this.roomsAudios, currentScene.key)){
                    this.roomsAudios[currentScene.key] = {};
                }
                this.roomsAudios[currentScene.key][audio.audio_key] = this.generateAudio(currentScene, audio);
                newAudiosCounter++;
                if(newAudiosCounter === audios.length){
                    currentScene.gameManager.events.emit('reldens.allAudiosLoaded', this, audios, currentScene, audio);
                }
                currentScene.gameManager.events.emit('reldens.audioLoaded', this, audios, currentScene, audio);
            });
        }
        currentScene.load.start();
    }

    audioExistsInScene(audioKey, currentScene)
    {
        if(!sc.isArray(currentScene.sound, 'sounds')){
            return false;
        }
        for(let sound of currentScene.sound.sounds){
            if(sound.key === audioKey){
                return true;
            }
        }
        return false;
    }

    updateDefaultConfig(defaultAudioConfig)
    {
        if(defaultAudioConfig){
            Object.assign(this.defaultAudioConfig, defaultAudioConfig);
        }
    }

}

module.exports.AudioManager = AudioManager;
