/**
 *
 * Reldens - InstructionsUi
 *
 */

class InstructionsUi
{

    setup(instConfig, scenePreloader)
    {
        scenePreloader.elementsUi['instructions'] = scenePreloader.add.dom(instConfig.uiX, instConfig.uiY)
            .createFromCache('instructions');
        let instructionsBox = scenePreloader.gameManager.gameDom.getElement('#instructions');
        if(instructionsBox){
            let closeButton = scenePreloader.gameManager.gameDom.getElement('#instructions-close');
            if(closeButton){
                closeButton.addEventListener('click', () => {
                    instructionsBox.style.display = 'none';
                });
            }
            let openButton = scenePreloader.elementsUi['instructions'].getChildByProperty('id', 'instructions-open');
            if(openButton){
                openButton.addEventListener('click', () => {
                    instructionsBox.style.display = 'block';
                });
            }
        }
    }

}

module.exports.InstructionsUi = InstructionsUi;
