/**
 *
 * Reldens - MinimapUi
 *
 */

const { sc } = require('@reldens/utils');

class MinimapUi
{

    createMinimap(minimapConfig, scenePreloader)
    {
        // @TODO - BETA - Replace by UserInterface.
        scenePreloader.elementsUi['minimap'] = scenePreloader.add.dom(minimapConfig.uiX, minimapConfig.uiY)
            .createFromCache('minimap');
        let openButton = scenePreloader.elementsUi['minimap'].getChildByProperty('id', 'minimap-open');
        let closeButton = scenePreloader.elementsUi['minimap'].getChildByProperty('id', 'minimap-close');
        openButton?.addEventListener('click', () => {
            let box = scenePreloader.elementsUi['minimap'].getChildByProperty('id', 'minimap-ui');
            box.classList.remove('hidden');
            openButton.classList.add('hidden');
            let minimap = scenePreloader.gameManager.getActiveScene().minimap;
            if(!minimap){
                return;
            }
            this.showMap(minimap, scenePreloader, openButton, closeButton, box);
        });
        closeButton?.addEventListener('click', () => {
            let box = scenePreloader.elementsUi['minimap'].getChildByProperty('id', 'minimap-ui');
            box.classList.add('hidden');
            if(openButton){
                openButton.classList.remove('hidden');
            }
            let minimap = scenePreloader.gameManager.getActiveScene().minimap;
            if(!minimap){
                return;
            }
            this.hideMap(minimap, scenePreloader, closeButton, box);
        });
    }

    showMap(minimap, scenePreloader, openButton, closeButton, box)
    {
        if(this.awaitForCamera(minimap)){
            setTimeout(() => {
                this.showMap(minimap, scenePreloader, openButton, closeButton, box);
            }, minimap.awaitOnCamera);
            return;
        }
        minimap.minimapCamera.setVisible(true);
        if(minimap.circle){
            minimap.circle.setVisible(true);
        }
        scenePreloader.gameManager.events.emit('reldens.openUI', {ui: this, openButton, minimap, box});
    }

    hideMap(minimap, scenePreloader, closeButton, box)
    {
        if(this.awaitForCamera(minimap)){
            setTimeout(() => {
                this.hideMap(minimap, scenePreloader, closeButton, box);
            }, minimap.awaitOnCamera);
            return;
        }
        minimap.minimapCamera.setVisible(false);
        if(minimap.circle){
            minimap.circle.setVisible(false);
        }
        scenePreloader.gameManager.events.emit(
            'reldens.closeUI',
            {ui: this, closeButton, minimap, box}
        );
    }

    awaitForCamera(minimap)
    {
        return 0 < minimap.awaitOnCamera && (!minimap.minimapCamera || !sc.isFunction(minimap.minimapCamera.setVisible));
    }

}

module.exports.MinimapUi = MinimapUi;
