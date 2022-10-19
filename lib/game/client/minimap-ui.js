/**
 *
 * Reldens - MinimapUi
 *
 */

class MinimapUi
{

    createMinimap(minimapConfig, scenePreloader)
    {
        let minimapUI = scenePreloader.getSceneDriver().addDomCreateFromCache(minimapConfig.uiX, minimapConfig.uiY, {the: 'minimap'});
        scenePreloader.getSceneDriver().setUiElement('minimap', minimapUI);
        let openButton = scenePreloader.getSceneDriver().getUiElement('minimap').getChildByProperty('id', 'minimap-open');
        let closeButton = scenePreloader.getSceneDriver().getUiElement('minimap').getChildByProperty('id', 'minimap-close');
        closeButton?.addEventListener('click', () => {
            let minimap = scenePreloader.gameManager.getActiveScene().minimap;
            if(!minimap.minimapCamera){
                return false;
            }
            let box = scenePreloader.getSceneDriver().getUiElement('minimap').getChildByProperty('id', 'minimap-ui');
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
            let minimap = scenePreloader.gameManager.getActiveScene().minimap;
            if(!minimap.minimapCamera){
                return false;
            }
            let box = scenePreloader.getSceneDriver().getUiElement('minimap').getChildByProperty('id', 'minimap-ui');
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
