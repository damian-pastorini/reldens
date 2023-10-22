/**
 *
 * Reldens - MinimapUi
 *
 */

class MinimapUi
{

    createMinimap(minimapConfig, scenePreloader)
    {
        // @TODO - BETA - Replace by UserInterface.
        scenePreloader.elementsUi['minimap'] = scenePreloader.add.dom(minimapConfig.uiX, minimapConfig.uiY)
            .createFromCache('minimap');
        let openButton = scenePreloader.elementsUi['minimap'].getChildByProperty('id', 'minimap-open');
        let closeButton = scenePreloader.elementsUi['minimap'].getChildByProperty('id', 'minimap-close');
        closeButton?.addEventListener('click', () => {
            let minimap = scenePreloader.gameManager.getActiveScene().minimap;
            if(!minimap.minimapCamera){
                return false;
            }
            let box = scenePreloader.elementsUi['minimap'].getChildByProperty('id', 'minimap-ui');
            box.classList.add('hidden');
            if(openButton){
                openButton.classList.remove('hidden');
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
            let box = scenePreloader.elementsUi['minimap'].getChildByProperty('id', 'minimap-ui');
            box.classList.remove('hidden');
            openButton.classList.add('hidden');
            minimap.minimapCamera.setVisible(true);
            if(minimap.circle){
                minimap.circle.setVisible(true);
            }
        });
    }

}

module.exports.MinimapUi = MinimapUi;
