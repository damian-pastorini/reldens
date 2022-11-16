/**
 *
 * Reldens - MinimapUi
 *
 */

class MinimapUi
{

    createMinimap(minimapConfig, uiSceneDriver, getActiveSceneCallback)
    {
        uiSceneDriver.usingElementUi().setupElement('minimap', minimapConfig.uiX, minimapConfig.uiY);

        let openButton = this.setupOpenButton(uiSceneDriver, getActiveSceneCallback);
        this.setupCloseButton(uiSceneDriver, getActiveSceneCallback, openButton);
    }

    setupOpenButton(uiSceneDriver, getActiveSceneCallback)
    {
        let openButton = uiSceneDriver.usingElementUi().getElementChildByProperty('minimap','id', 'minimap-open');
        openButton?.addEventListener('click', () => {
            let minimap = getActiveSceneCallback().minimap;
            if (!minimap.minimapCamera) {
                return false;
            }
            let box = uiSceneDriver.usingElementUi().getElementChildByProperty('minimap', 'id', 'minimap-ui');
            box.style.display = 'block';
            openButton.style.display = 'none';
            minimap.minimapCamera.setVisible(true);
            if (minimap.circle) {
                minimap.circle.setVisible(true);
            }
        });
        return openButton;
    }

    setupCloseButton(uiSceneDriver, getActiveSceneCallback, openButton)
    {
        let closeButton = uiSceneDriver.usingElementUi().getElementChildByProperty('minimap', 'id', 'minimap-close');
        closeButton?.addEventListener('click', () => {
            //TODO: Resolve how uiSceneDriver can access the minimap object implemented on the dynamic scene (which is the actual scene).
            let minimap = getActiveSceneCallback().minimap;
            if (!minimap.minimapCamera) {
                return false;
            }
            let box = uiSceneDriver.usingElementUi().getElementChildByProperty('minimap', 'id', 'minimap-ui');
            box.style.display = 'none';
            if (openButton) {
                openButton.style.display = 'block';
            }
            minimap.minimapCamera.setVisible(false);
            if (minimap.circle) {
                minimap.circle.setVisible(false);
            }
        });
    }
}

module.exports.MinimapUi = MinimapUi;
