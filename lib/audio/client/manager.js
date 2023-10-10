/**
 *
 * Reldens - Audio Manager
 *
 */

const { AudioConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class AudioManager
{

    constructor(props)
    {
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in ChatPlugin.');
        }
        this.globalAudios = sc.get(props, 'globalAudios', {});
        this.roomsAudios = sc.get(props, 'roomsAudios', {});
        this.categories = sc.get(props, 'categories', {});
        this.playerConfig = sc.get(props, 'playerConfig', {});
        // @NOTE: it's important to add any been played audios here for the "changeMuteState" method.
        this.playing = {};
        this.currentMuteState = false;
        this.changedMutedState = {};
        this.lockedMuteState = false;
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

    async setAudio(audioKey, enabled)
    {
        if(this.lockedMuteState){
            Logger.info('Locked mute state to set audio.');
            return false;
        }
        await this.events.emit('reldens.setAudio', {
            audioManager: this,
            categoryKey: audioKey,
            enabled
        });
        let category = this.categories[audioKey];
        this.playerConfig[category.id] = enabled ? 1 : 0;
        if(!sc.hasOwn(this.playing, audioKey)){
            return true;
        }
        let playOrStop = enabled ? 'play' : 'stop';
        let playingElement = this.playing[audioKey];
        if(category.single_audio && sc.isObjectFunction(playingElement, playOrStop)){
            // if is single track we will stop or play the last audio:
            return this.setAudioForSingleEntity(playingElement, playOrStop, audioKey, enabled);
        }
        return this.setAudioForElementChildren(playingElement, category, enabled);
    }


    setAudioForSingleEntity(playingElement, playOrStop, audioKey, enabled)
    {
        if(!playingElement){
            Logger.error('Missing playingElement.', {audioKey, playingElement});
            return false;
        }
        if(!playingElement.currentConfig){
            // Logger.error('Possible null WebAudioSound as playingElement.', {audioKey, playingElement});
            return false;
        }
        if(!sc.isObjectFunction(playingElement, playOrStop)){
            Logger.error('Missing playOrStop method in playingElement.', {audioKey, playOrStop, playingElement});
            return false;
        }
        try {
            playingElement[playOrStop]();
            playingElement.mute = !enabled;
        } catch (err) {
            Logger.error('PlayingElement error.', {audioKey, playOrStop, playingElement, err});
        }
        return true;
    }

    setAudioForElementChildren(playingElement, category, enabled)
    {
        // if is multi-track we will only stop all the audios but replay them only when the events require it:
        if(category.single_audio){
            return false;
        }
        let audioKeys = Object.keys(playingElement);
        if(0 === audioKeys.length){
            return false;
        }
        for(let i of audioKeys){
            this.setAudioForSingleEntity(playingElement[i], 'stop', i, enabled);
        }
        return true;
    }

    generateAudio(onScene, audio)
    {
        let soundConfig = Object.assign({}, this.defaultAudioConfig, (audio.config || {}));
        if(!sc.hasOwn(onScene.cache.audio.entries.entries, audio.audio_key)){
            Logger.error(
                'Audio file does not exists. Audio key: ' + audio.audio_key,
                onScene.cache.audio.entries.entries
            );
            return false;
        }
        let audioInstance = onScene.sound.add(audio.audio_key, soundConfig);
        if(audio.markers && 0 < audio.markers.length){
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
        if(0 === objectKeys.length){
            return false;
        }
        if(sc.hasOwn(audiosObject, audioKey)){
            return {audio: audiosObject[audioKey], marker: false};
        }
        for(let i of objectKeys){
            let audio = audiosObject[i];
            if(sc.hasOwn(audio.audioInstance.markers, audioKey)){
                return {audio, marker: audioKey};
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

    async loadGlobalAudios(audios, currentScene)
    {
        let audioKeys = Object.keys(audios);
        if(0 === audioKeys.length){
            return false;
        }
        await this.loadByKeys(audioKeys, audios, currentScene, 'globalAudios');
    }

    async loadAudiosInScene(audios, currentScene)
    {
        let audioKeys = Object.keys(audios);
        if(0 === audioKeys.length){
            return false;
        }
        if(!sc.hasOwn(this.roomsAudios, currentScene.key)){
            this.roomsAudios[currentScene.key] = {};
        }
        await this.loadByKeys(audioKeys, audios, currentScene, 'roomsAudios');
    }

    async loadByKeys(audioKeys, audios, currentScene, storageKey)
    {
        let newAudiosCounter = 0;
        for(let i of audioKeys){
            let audio = audios[i];
            this.removeSceneAudioByAudioKey(currentScene, audio.audio_key);
            let filesArr = await this.prepareFiles(audio);
            if(0 === filesArr.length){
                continue;
            }
            let audioLoader = currentScene.load.audio(audio.audio_key, filesArr);
            audioLoader.on('filecomplete', async (completedFileKey) => {
                if(completedFileKey !== audio.audio_key){
                    return false;
                }
                let generateAudio = this.generateAudio(currentScene, audio);
                if(false === generateAudio){
                    Logger.error('AudioLoader can not generate the audio.', {
                        'Audio key:': audio.audio_key,
                        'Storage key:': storageKey,
                    });
                    return false;
                }
                storageKey === 'roomsAudios'
                    ? this.roomsAudios[currentScene.key][audio.audio_key] = generateAudio
                    : this.globalAudios[audio.audio_key] = generateAudio;
                newAudiosCounter++;
                await this.fireAudioEvents(audios, currentScene, audio, newAudiosCounter);
            });
            audioLoader.start();
        }
    }

    async existsFileByXMLHttpRequest(url)
    {
        let http = new XMLHttpRequest();
        http.open('HEAD', url, false);
        await http.send();
        return 404 !== http.status;
    }

    async prepareFiles(audio)
    {
        let filesName = audio.files_name.split(',');
        let filesArr = [];
        for(let fileName of filesName){
            let audioPath = AudioConst.AUDIO_BUCKET + '/' + fileName;
            let testPath = await this.existsFileByXMLHttpRequest(audioPath);
            if(false === testPath){
                continue;
            }
            filesArr.push(audioPath);
        }
        return filesArr;
    }

    async fireAudioEvents(audios, currentScene, audio, newAudiosCounter)
    {
        await currentScene.gameManager.events.emit('reldens.audioLoaded', this, audios, currentScene, audio);
        if(newAudiosCounter === audios.length){
            await currentScene.gameManager.events.emit('reldens.allAudiosLoaded', this, audios, currentScene, audio);
        }
    }

    removeAudiosFromScene(audios, currentScene)
    {
        if(0 === audios.length || !currentScene){
            return false;
        }
        for(let audio of audios){
            this.removeSceneAudioByAudioKey(currentScene, audio.audio_key);
        }
        return true;
    }

    removeSceneAudioByAudioKey(scene, audioKey)
    {
        scene.sound.removeByKey(audioKey);
        if(sc.hasOwn(scene.cache.audio.entries.entries, audioKey)){
            delete scene.cache.audio.entries.entries[audioKey];
        }
        if(sc.hasOwn(this.roomsAudios[scene.key], audioKey)){
            delete this.roomsAudios[scene.key][audioKey];
        }
        if(sc.hasOwn(this.globalAudios, audioKey)){
            delete this.globalAudios[audioKey];
        }
    }

    updateDefaultConfig(defaultAudioConfig)
    {
        if(sc.isObject(defaultAudioConfig)){
            Object.assign(this.defaultAudioConfig, defaultAudioConfig);
        }
    }

    async processUpdateData(message, room, gameManager)
    {
        if(message.playerConfig){
            this.playerConfig = message.playerConfig;
        }
        if(message.categories){
            this.addCategories(message.categories);
            await this.events.emit('reldens.audioManagerUpdateCategoriesLoaded', this, room, gameManager, message);
        }
        let audios = sc.get(message, 'audios', {});
        if(0 < Object.keys(audios).length){
            let currentScene = gameManager.gameEngine.scene.getScene(room.name);
            await this.loadAudiosInScene(audios, currentScene);
            await this.events.emit('reldens.audioManagerUpdateAudiosLoaded', this, room, gameManager, message);
        }
    }

    async processDeleteData(message, room, gameManager)
    {
        if(0 === message.audios.length){
            return false;
        }
        let currentScene = gameManager.gameEngine.scene.getScene(room.name);
        this.removeAudiosFromScene(message.audios, currentScene);
        await this.events.emit('reldens.audioManagerDeleteAudios', this, room, gameManager, message);
    }

    destroySceneAudios()
    {
        let playingKeys = Object.keys(this.playing);
        if(0 === playingKeys.length){
            return false;
        }
        for(let i of playingKeys){
            let playingAudioCategory = this.playing[i];
            let categoryData = this.categories[i];
            // @TODO - BETA - Check and refactor if possible to use scene delete by key.
            if(categoryData.single_audio && sc.isObjectFunction(playingAudioCategory, 'stop')){
                playingAudioCategory.stop();
                delete this.playing[i];
                continue;
            }
            let playingCategoryKeys = Object.keys(playingAudioCategory);
            if(!categoryData.single_audio && 0 === playingCategoryKeys.length){
                continue;
            }
            for(let a of playingCategoryKeys){
                let playingAudio = playingAudioCategory[a];
                if(sc.isObjectFunction(playingAudio, 'stop')){
                    playingAudio.stop();
                    delete playingAudio[i];
                }
            }
        }
    }

    async changeMuteState(newMuteState, newMuteLockState)
    {
        if(false === newMuteLockState){
            this.lockedMuteState = false;
        }
        this.currentMuteState = newMuteState;
        if(this.lockedMuteState && false !== newMuteLockState){
            Logger.info('Locked mute state from changes.');
            return false;
        }
        return newMuteState ? await this.muteCategories(newMuteLockState) : await this.restoreMute(newMuteLockState);
    }

    async muteCategories(newMuteLockState)
    {
        let categoriesKeys = Object.keys(this.categories);
        if(0 < categoriesKeys.length){
            Logger.info('Mute categories not found.');
            return false;
        }
        for(let i of categoriesKeys){
            this.changedMutedState[i] = this.currentMuteState;
            await this.setAudio(i, false);
        }
        this.setMuteLock(newMuteLockState);
        return true;
    }

    async restoreMute(newMuteLockState)
    {
        let changedKeys = Object.keys(this.changedMutedState);
        if(0 === changedKeys.length){
            this.setMuteLock(newMuteLockState);
            return false;
        }
        for(let i of changedKeys){
            await this.setAudio(i, true);
        }
        this.setMuteLock(newMuteLockState);
        this.changedMutedState = {};
        return true;
    }

    setMuteLock(newMuteLockState)
    {
        if (false === newMuteLockState) {
            this.lockedMuteState = false;
        }
        if (true === newMuteLockState) {
            this.lockedMuteState = true;
        }
    }

}

module.exports.AudioManager = AudioManager;
