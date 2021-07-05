/**
 *
 * Reldens - MinimapUi
 *
 */

class MinimapUi
{

    setup(minimapConfig, scenePreloader)
    {
        scenePreloader.elementsUi['minimap'] = scenePreloader.add.dom(minimapConfig.uiX, minimapConfig.uiY)
            .createFromCache('minimap');
        let closeButton = scenePreloader.elementsUi['minimap'].getChildByProperty('id', 'minimap-close');
        let openButton = scenePreloader.elementsUi['minimap'].getChildByProperty('id', 'minimap-open');
        if(closeButton && openButton){
            closeButton.addEventListener('click', () => {
                let minimap = scenePreloader.gameManager.getActiveScene().minimap;
                if(!minimap.minimapCamera){
                    return false;
                }
                let box = scenePreloader.elementsUi['minimap'].getChildByProperty('id', 'minimap-ui');
                box.style.display = 'none';
                openButton.style.display = 'block';
                minimap.minimapCamera.setVisible(false);
                if(minimap.circle) {
                    minimap.circle.setVisible(false);
                }
            });
            openButton.addEventListener('click', () => {
                let minimap = scenePreloader.gameManager.getActiveScene().minimap;
                if(!minimap.minimapCamera){
                    return false;
                }
                let box = scenePreloader.elementsUi['minimap'].getChildByProperty('id', 'minimap-ui');
                box.style.display = 'block';
                openButton.style.display = 'none';
                minimap.minimapCamera.setVisible(true);
                if(minimap.circle){
                    minimap.circle.setVisible(true);
                }
            });
        }
    }

}

module.exports.MinimapUi = MinimapUi;
