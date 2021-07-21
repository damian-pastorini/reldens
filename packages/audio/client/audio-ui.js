/**
 *
 * Reldens - AudioUiCreate
 *
 * This class will handle the chat UI and assign all the related events and actions.
 *
 */

const { AudioConst } = require('../constants');

class AudioUi
{

    constructor(uiScene)
    {
        this.uiScene = uiScene;
        this.gameManager = this.uiScene.gameManager;
    }

    createUi()
    {
        if(!this.gameManager.audioManager.categories){
            return;
        }
        let audioSettingsTemplate = this.uiScene.cache.html.get('audio');
        let audioCategoryTemplate = this.uiScene.cache.html.get('audio-category');
        let categoriesRows = '';
        for(let i of Object.keys(this.gameManager.audioManager.categories)){
            let audioCategory = this.gameManager.audioManager.categories[i];
            categoriesRows = categoriesRows + this.gameManager.gameEngine.parseTemplate(audioCategoryTemplate, {
                categoryId: audioCategory.id,
                categoryLabel: audioCategory.category_label,
                categoryKey: audioCategory.category_key,
                categoryChecked: audioCategory.enabled ? ' checked="checked"' : ''
            });
        }
        let audioSettingsContent = this.gameManager.gameEngine.parseTemplate(audioSettingsTemplate, {
            audioCategories: categoriesRows
        });
        this.gameManager.gameDom.appendToElement('#settings-dynamic', audioSettingsContent);
        let audioSettingInputs = this.gameManager.gameDom.getElements('.audio-setting');
        if(audioSettingInputs.length){
            for(let settingInput of audioSettingInputs){
                settingInput.addEventListener('click', (event) => {
                    this.gameManager.audioManager.setAudio(event.target.dataset['categoryKey'], settingInput.checked);
                    this.sendAudioUpdate(settingInput.value, settingInput.checked, this.gameManager.activeRoomEvents);
                });
            }
        }
    }

    sendAudioUpdate(updateType, updateValue, roomEvents)
    {
        let messageData = {act: AudioConst.AUDIO_UPDATE, up: updateValue, ck: updateType};
        roomEvents.room.send(messageData);
    }

}

module.exports.AudioUi = AudioUi;
