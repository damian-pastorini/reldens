/**
 *
 * Reldens - InstructionsUi
 *
 */

class InstructionsUi
{

    createInstructions(instConfig, scenePreloader)
    {
        let instructions = scenePreloader.sceneDriver.addDomCreateFromCache(instConfig.uiX, instConfig.uiY, {the: 'instructions'});
        scenePreloader.sceneDriver.setUiElement('instructions', instructions);
        let instructionsBox = scenePreloader.gameManager.gameDom.getElement('#instructions');
        if(!instructionsBox){
            return false;
        }
        let closeButton = scenePreloader.gameManager.gameDom.getElement('#instructions-close');
        closeButton?.addEventListener('click', () => {
            instructionsBox.style.display = 'none';
        });
        let openButton = scenePreloader.sceneDriver.getUiElement('instructions').getChildByProperty('id', 'instructions-open');
        openButton?.addEventListener('click', () => {
            instructionsBox.style.display = 'block';
        });
    }

}

module.exports.InstructionsUi = InstructionsUi;
