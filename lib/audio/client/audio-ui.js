/**
 *
 * Reldens - AudioUiCreate
 *
 * This class will handle the chat UI and assign all the related events and actions.
 *
 */

const { SceneAudioPlayer } = require('./scene-audio-player');
const { AudioConst } = require('../constants');
const { sc } = require('@reldens/utils');

class AudioUi
{

    constructor(uiSceneManager)
    {
        this.uiSceneManager = uiSceneManager;
        this.audioManager = this.uiSceneManager.audioManager;
        this.sceneAudioPlayer = SceneAudioPlayer;
    }

    createUi()
    {
        if(!this.audioManager.categories){
            return;
        }

        let audioSettingsContent = this.prepareAudioSettingsContent();
        this.uiSceneManager.gameDom.appendToElement('#settings-dynamic', audioSettingsContent);
        let audioSettingInputs = this.uiSceneManager.gameDom.getElements('.audio-setting');
        if(0 === audioSettingInputs.length){
            return false;
        }
        for(let settingInput of audioSettingInputs){
            settingInput.addEventListener('click', async (event) => {
                await this.audioManager.setAudio(event.target.dataset['categoryKey'], settingInput.checked);
                this.sendAudioUpdate(settingInput.value, settingInput.checked, this.uiSceneManager.getActiveRoomEventsCallback());
                this.sceneAudioPlayer.playSceneAudio(this.audioManager, this.uiSceneManager.getActiveSceneCallback());
            });
        }
    }

    prepareAudioSettingsContent()
    {
        let categoriesRows = this.prepareCategoriesRows();
        return this.uiSceneManager.uiSceneDriver.parseLoadedContent('audio', {audioCategories: categoriesRows});
    }

    prepareCategoriesRows()
    {
        let categoriesRows = '';
        let audioCategoriesKeys = Object.keys(this.audioManager.categories);
        for(let i of audioCategoriesKeys){
            let audioCategory = this.audioManager.categories[i];
            let audioEnabled = sc.get(this.audioManager.playerConfig, audioCategory.id, audioCategory.enabled);
            categoriesRows += this.uiSceneManager.uiSceneDriver.parseLoadedContent('audio-category', {
                categoryId: audioCategory.id,
                categoryLabel: audioCategory.category_label,
                categoryKey: audioCategory.category_key,
                categoryChecked: audioEnabled ? ' checked="checked"' : ''
            });
        }
        return categoriesRows;
    }

    sendAudioUpdate(updateType, updateValue, roomEvents)
    {
        roomEvents.room.send('*', {
            act: AudioConst.AUDIO_UPDATE,
            up: updateValue,
            ck: updateType
        });
    }

}

module.exports.AudioUi = AudioUi;
