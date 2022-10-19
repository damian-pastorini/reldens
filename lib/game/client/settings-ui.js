/**
 *
 * Reldens - SettingsUi
 *
 */

class SettingsUi
{

    createSettings(settingsConfig, scenePreloader)
    {
        let sceneDriver = scenePreloader.getSceneDriver();
        let settings = sceneDriver.addDomCreateFromCache(settingsConfig.uiX, settingsConfig.uiY, {the: 'settings'});
        sceneDriver.setUiElement('settings', settings);
        let settingsTemplate = sceneDriver.getCacheHtml('settings-content');
        scenePreloader.gameManager.gameDom.appendToElement('.content', settingsTemplate);
        let uiSettingsBox = scenePreloader.gameManager.gameDom.getElement('#settings-ui');
        let closeButton = scenePreloader.gameManager.gameDom.getElement('#settings-close');
        let openButton = sceneDriver.getUiElement('settings').getChildByProperty('id', 'settings-open');
        // @TODO - BETA - Replace by add, remove class.
        closeButton?.addEventListener('click', () => {
            uiSettingsBox.style.display = 'none';
            if(openButton){
                openButton.style.display = 'block';
            }
        });
        openButton?.addEventListener('click', () => {
            uiSettingsBox.style.display = 'block';
            if(openButton){
                openButton.style.display = 'none';
            }
        });
    }

}

module.exports.SettingsUi = SettingsUi;
