/**
 *
 * Reldens - SettingsUi
 *
 */

class SettingsUi
{
    constructor(settingsConfig, uiSceneDriver, GameDom)
    {
        this.createSettings(settingsConfig, uiSceneDriver, GameDom);
    }

    createSettings(settingsConfig, uiSceneDriver, GameDom)
    {
        uiSceneDriver.usingElementUi().setupElement('settings', settingsConfig.uiX, settingsConfig.uiY);

        let settingsTemplate = uiSceneDriver.getCacheHtml('settings-content');
        GameDom.appendToElement('.content', settingsTemplate);

        let uiSettingsBox = GameDom.getElement('#settings-ui');
        let closeButton = GameDom.getElement('#settings-close');
        let openButton = uiSceneDriver.usingElementUi().getElementChildByID('settings', 'settings-open');

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
