/**
 *
 * Reldens - AudioUi
 *
 */

const { SceneAudioPlayer } = require('./scene-audio-player');
const { AudioUpdate } = require('./audio-update');
const { sc } = require('@reldens/utils');

class AudioUi
{

    constructor(uiScene)
    {
        this.uiScene = uiScene;
        this.gameManager = this.uiScene.gameManager;
        this.audioManager = this.gameManager.audioManager;
        this.sceneAudioPlayer = SceneAudioPlayer;
    }

    createUi()
    {
        if(!this.audioManager.categories){
            return;
        }
        let audioSettingsTemplate = this.uiScene.cache.html.get('audio');
        let audioCategoryTemplate = this.uiScene.cache.html.get('audio-category');
        let audioSettingsContent = this.prepareAudioSettingsContent(audioCategoryTemplate, audioSettingsTemplate);
        this.gameManager.gameDom.appendToElement('#settings-dynamic', audioSettingsContent);
        let audioSettingInputs = this.gameManager.gameDom.getElements('.audio-setting');
        if(0 === audioSettingInputs.length){
            return false;
        }
        for(let settingInput of audioSettingInputs){
            settingInput.addEventListener('click', async (event) => {
                await this.audioManager.setAudio(event.target.dataset.categoryKey, settingInput.checked);
                this.gameManager.activeRoomEvents.room.send(
                    '*',
                    new AudioUpdate(settingInput.value, settingInput.checked)
                );
                this.sceneAudioPlayer.playSceneAudio(this.audioManager, this.gameManager.getActiveScene());
            });
        }
    }

    prepareAudioSettingsContent(audioCategoryTemplate, audioSettingsTemplate)
    {
        let categoriesRows = this.prepareCategoriesRows(audioCategoryTemplate);
        return this.gameManager.gameEngine.parseTemplate(
            audioSettingsTemplate,
            {
                audioCategories: categoriesRows,
                settingsTitle: this.gameManager.services.translator.t('audio.settingsTitle')
            }
        );
    }

    prepareCategoriesRows(audioCategoryTemplate)
    {
        let categoriesRows = '';
        let audioCategoriesKeys = Object.keys(this.audioManager.categories);
        for(let i of audioCategoriesKeys){
            let audioCategory = this.audioManager.categories[i];
            let audioEnabled = sc.get(this.audioManager.playerConfig, audioCategory.id, audioCategory.enabled);
            categoriesRows = categoriesRows + this.gameManager.gameEngine.parseTemplate(audioCategoryTemplate, {
                categoryId: audioCategory.id,
                categoryLabel: audioCategory.category_label,
                categoryKey: audioCategory.category_key,
                categoryChecked: audioEnabled ? ' checked="checked"' : ''
            });
        }
        return categoriesRows;
    }

}

module.exports.AudioUi = AudioUi;
