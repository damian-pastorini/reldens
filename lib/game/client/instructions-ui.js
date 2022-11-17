/**
 *
 * Reldens - InstructionsUi
 *
 */

class InstructionsUi
{

    constructor(instructionConfig, uiSceneDriver, GameDom)
    {
        this.createInstructions(instructionConfig, uiSceneDriver, GameDom);
    }

    createInstructions(instructionConfig, uiSceneDriver, GameDom)
    {
        uiSceneDriver.usingElementUi().setupElement('instructions', instructionConfig.uiX, instructionConfig.uiY);
        let instructionsBox = GameDom.getElement('#instructions');
        if(!instructionsBox){
            return false;
        }
        let closeButton = GameDom.getElement('#instructions-close');
        closeButton?.addEventListener('click', () => {
            instructionsBox.style.display = 'none';
        });
        let openButton = uiSceneDriver.usingElementUi().getElementChildByID('instructions', 'instructions-open');
        openButton?.addEventListener('click', () => {
            instructionsBox.style.display = 'block';
        });
    }

}

module.exports.InstructionsUi = InstructionsUi;
