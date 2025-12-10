/**
 *
 * Reldens - MinimapUi
 *
 * Client-side minimap UI component for managing the minimap display interface. Creates DOM-based
 * open/close buttons, handles minimap visibility toggling, waits for camera initialization, and
 * emits events for UI state changes. Works in conjunction with the Minimap class for camera management.
 *
 */

const { sc } = require('@reldens/utils');

/**
 * @typedef {import('./minimap').Minimap} Minimap
 * @typedef {import('./scene-preloader').ScenePreloader} ScenePreloader
 * @typedef {object} MinimapConfig
 * @property {number} uiX
 * @property {number} uiY
 */
class MinimapUi
{

    /**
     * @param {MinimapConfig} minimapConfig
     * @param {ScenePreloader} scenePreloader
     */
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

    /**
     * @param {Minimap} minimap
     * @param {ScenePreloader} scenePreloader
     * @param {HTMLElement} openButton
     * @param {HTMLElement} closeButton
     * @param {HTMLElement} box
     */
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

    /**
     * @param {Minimap} minimap
     * @param {ScenePreloader} scenePreloader
     * @param {HTMLElement} closeButton
     * @param {HTMLElement} box
     */
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

    /**
     * @param {Minimap} minimap
     * @returns {boolean}
     */
    awaitForCamera(minimap)
    {
        return 0 < minimap.awaitOnCamera && (!minimap.minimapCamera || !sc.isFunction(minimap.minimapCamera.setVisible));
    }

}

module.exports.MinimapUi = MinimapUi;
