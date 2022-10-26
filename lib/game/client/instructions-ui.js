/**
 *
 * Reldens - InstructionsUi
 *
 */

class InstructionsUi
{

    createInstructions(instructionConfig, uiSceneDriver, GameDom)
    {
        let instructions = uiSceneDriver.addDomCreateFromCache(instructionConfig.uiX, instructionConfig.uiY,
            {the: 'instructions'});
        uiSceneDriver.setUiElement('instructions', instructions);
        let instructionsBox = GameDom.getElement('#instructions');
        if(!instructionsBox){
            return false;
        }
        let closeButton = GameDom.getElement('#instructions-close');
        closeButton?.addEventListener('click', () => {
            instructionsBox.style.display = 'none';
        });
        let openButton = uiSceneDriver.getUiElement('instructions').getChildByProperty('id', 'instructions-open');
        openButton?.addEventListener('click', () => {
            instructionsBox.style.display = 'block';
        });
    }

}

module.exports.InstructionsUi = InstructionsUi;
