/**
 *
 * Reldens - AudioUi
 *
 * Manages the audio settings user interface in the game.
 *
 */

const { SceneAudioPlayer } = require('./scene-audio-player');
const { AudioUpdate } = require('./audio-update');
const { sc } = require('@reldens/utils');

/**
 * @typedef {import('phaser').Scene} PhaserScene
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 * @typedef {import('./manager').AudioManager} AudioManager
 * @typedef {import('./scene-audio-player').SceneAudioPlayer} SceneAudioPlayer
 */
class AudioUi
{

    /**
     * @param {PhaserScene} uiScene
     */
    constructor(uiScene)
    {
        /** @type {PhaserScene} */
        this.uiScene = uiScene;
        /** @type {GameManager} */
        this.gameManager = this.uiScene.gameManager;
        /** @type {AudioManager} */
        this.audioManager = this.gameManager.audioManager;
        /** @type {SceneAudioPlayer} */
        this.sceneAudioPlayer = SceneAudioPlayer;
    }

    /**
     * @returns {boolean|void}
     */
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
                this.gameManager.activeRoomEvents.send(new AudioUpdate(settingInput.value, settingInput.checked));
                this.sceneAudioPlayer.playSceneAudio(this.audioManager, this.gameManager.getActiveScene());
            });
        }
    }

    /**
     * @param {string} audioCategoryTemplate
     * @param {string} audioSettingsTemplate
     * @returns {string}
     */
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

    /**
     * @param {string} audioCategoryTemplate
     * @returns {string}
     */
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
