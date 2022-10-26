/**
 *
 * Reldens - SettingsUi
 *
 */

class SettingsUi
{

    createSettings(settingsConfig, uiSceneDriver, GameDom)
    {
        let settings = uiSceneDriver.addDomCreateFromCache(settingsConfig.uiX, settingsConfig.uiY, {the: 'settings'});
        uiSceneDriver.setUiElement('settings', settings);
        let settingsTemplate = uiSceneDriver.getCacheHtml('settings-content');
        GameDom.appendToElement('.content', settingsTemplate);
        let uiSettingsBox = GameDom.getElement('#settings-ui');
        let closeButton = GameDom.getElement('#settings-close');
        let openButton = uiSceneDriver.getUiElement('settings').getChildByProperty('id', 'settings-open');
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
