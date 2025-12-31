/**
 *
 * Reldens - InstructionsUi
 *
 * Client-side UI component for displaying game instructions dialog. Creates a DOM-based dialog box
 * with open/close buttons, handles click events to show/hide instructions, and registers the element
 * with the UI scene. Emits events for UI open/close to allow plugin hooks and customization.
 *
 */

const { Logger } = require('@reldens/utils');

/**
 * @typedef {import('./user-interface').UserInterface} UserInterface
 * @typedef {object} InstConfig
 * @property {number} uiX
 * @property {number} uiY
 */
class InstructionsUi
{

    /**
     * @param {InstConfig} instConfig
     * @param {UserInterface} uiScene
     * @returns {void|boolean}
     */
    createInstructions(instConfig, uiScene)
    {
        // @TODO - BETA - Replace by UserInterface.
        let dialogBox = uiScene.add.dom(instConfig.uiX, instConfig.uiY).createFromCache('instructions');
        if(!dialogBox){
            Logger.info('Instructions dialog box could not be created.');
            return false;
        }
        let dialogContainer = uiScene.gameManager.gameDom.getElement('#instructions');
        if(!dialogContainer){
            Logger.info('Instructions container not found.');
            return false;
        }
        let openButton = dialogBox.getChildByProperty('id', 'instructions-open');
        openButton?.addEventListener('click', () => {
            // @TODO - BETA - Replace styles by classes.
            dialogContainer.style.display = 'block';
            uiScene.gameManager.events.emit(
                'reldens.openUI',
                {ui: this, openButton, dialogBox, dialogContainer, uiScene}
            );
        });
        let closeButton = uiScene.gameManager.gameDom.getElement('#instructions-close');
        closeButton?.addEventListener('click', () => {
            // @TODO - BETA - Replace styles by classes.
            dialogContainer.style.display = 'none';
            uiScene.gameManager.events.emit(
                'reldens.closeUI',
                {ui: this, closeButton, openButton, dialogBox, dialogContainer, uiScene}
            );
        });
        uiScene.elementsUi['instructions'] = dialogBox;
    }

}

module.exports.InstructionsUi = InstructionsUi;
