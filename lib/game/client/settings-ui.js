/**
 *
 * Reldens - SettingsUi
 *
 */

const { Logger } = require('@reldens/utils');
const {ChatConst} = require("../../chat/constants");

class SettingsUi
{

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
