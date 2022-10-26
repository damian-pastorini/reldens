/**
 *
 * Reldens - MinimapUi
 *
 */

class MinimapUi
{

    createMinimap(minimapConfig, uiSceneDriver, getActiveSceneCallback)
    {
        let minimapUI = uiSceneDriver.addDomCreateFromCache(minimapConfig.uiX, minimapConfig.uiY, {the: 'minimap'});
        uiSceneDriver.setUiElement('minimap', minimapUI);
        let openButton = uiSceneDriver.getUiElement('minimap').getChildByProperty('id', 'minimap-open');
        let closeButton = uiSceneDriver.getUiElement('minimap').getChildByProperty('id', 'minimap-close');
        closeButton?.addEventListener('click', () => {
            let minimap = getActiveSceneCallback().minimap;
            if(!minimap.minimapCamera){
                return false;
            }
            let box = uiSceneDriver.getUiElement('minimap').getChildByProperty('id', 'minimap-ui');
            box.style.display = 'none';
            if(openButton){
                openButton.style.display = 'block';
            }
            minimap.minimapCamera.setVisible(false);
            if(minimap.circle){
                minimap.circle.setVisible(false);
            }
        });
        openButton?.addEventListener('click', () => {
            let minimap = getActiveSceneCallback().minimap;
            if(!minimap.minimapCamera){
                return false;
            }
            let box = uiSceneDriver.getUiElement('minimap').getChildByProperty('id', 'minimap-ui');
            box.style.display = 'block';
            openButton.style.display = 'none';
            minimap.minimapCamera.setVisible(true);
            if(minimap.circle){
                minimap.circle.setVisible(true);
            }
        });
    }

}

module.exports.MinimapUi = MinimapUi;
