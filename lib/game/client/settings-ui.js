/**
 *
 * Reldens - SettingsUi
 *
 * Client-side settings UI component for displaying the game settings dialog. Creates a DOM-based
 * dialog box with open/close buttons, handles click events to show/hide settings, and registers
 * the element with the UI scene. Emits events for UI open/close to allow plugin hooks.
 *
 */

const { Logger } = require('@reldens/utils');

/**
 * @typedef {import('phaser').Scene} Scene
 */
class SettingsUi
{

    /**
     * @param {Object} settingsConfig
     * @param {Scene} uiScene
     * @returns {boolean}
     */
    createSettings(settingsConfig, uiScene)
    {
        // @TODO - BETA - Replace by UserInterface.
        let dialogBox = uiScene.add.dom(settingsConfig.uiX, settingsConfig.uiY).createFromCache('settings');
        if(!dialogBox){
            Logger.info('Settings dialog box could not be created.');
            return false;
        }
        let settingsTemplate = uiScene.cache.html.get('settings-content');
        if(!settingsTemplate){
            Logger.info('Settings template not found.');
            return false;
        }
        uiScene.gameManager.gameDom.appendToElement('.content', settingsTemplate);
        let dialogContainer = uiScene.gameManager.gameDom.getElement('#settings-ui');
        if(!dialogContainer){
            Logger.info('Settings container not found.');
            return false;
        }
        let closeButton = uiScene.gameManager.gameDom.getElement('#settings-close');
        let openButton = dialogBox.getChildByProperty('id', 'settings-open');
        openButton?.addEventListener('click', () => {
            // @TODO - BETA - Replace styles classes.
            dialogContainer.style.display = 'block';
            if(openButton){
                openButton.style.display = 'none';
            }
            uiScene.gameManager.events.emit(
                'reldens.openUI',
                {ui: this, openButton, dialogBox, dialogContainer, uiScene}
            );
        });
        closeButton?.addEventListener('click', () => {
            // @TODO - BETA - Replace styles classes.
            dialogContainer.style.display = 'none';
            if(openButton){
                openButton.style.display = 'block';
            }
            uiScene.gameManager.events.emit(
                'reldens.closeUI',
                {ui: this, closeButton, openButton, dialogBox, dialogContainer, uiScene}
            );
        });
        uiScene.elementsUi['settings'] = dialogBox;
    }

}

module.exports.SettingsUi = SettingsUi;
