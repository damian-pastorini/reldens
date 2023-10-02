/**
 *
 * Reldens - InstructionsUi
 *
 */

const { Logger } = require('@reldens/utils');

class InstructionsUi
{

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
