/**
 *
 * Reldens - InstructionsUi
 *
 */

class InstructionsUi
{

    createInstructions(instConfig, scenePreloader)
    {
        scenePreloader.elementsUi['instructions'] = scenePreloader.add.dom(instConfig.uiX, instConfig.uiY)
            .createFromCache('instructions');
        let instructionsBox = scenePreloader.gameManager.gameDom.getElement('#instructions');
        if(!instructionsBox){
            return false;
        }
        let closeButton = scenePreloader.gameManager.gameDom.getElement('#instructions-close');
        closeButton?.addEventListener('click', () => {
            instructionsBox.style.display = 'none';
        });
        let openButton = scenePreloader.elementsUi['instructions'].getChildByProperty('id', 'instructions-open');
        openButton?.addEventListener('click', () => {
            instructionsBox.style.display = 'block';
        });
    }

}

module.exports.InstructionsUi = InstructionsUi;
