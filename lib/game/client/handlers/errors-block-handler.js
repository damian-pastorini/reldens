/**
 *
 * Reldens - ErrorsBlockHandler
 *
 */

const { GameConst } = require('../../constants');

class ErrorsBlockHandler
{

    static reset(form)
    {
        let errorBlock = form.querySelector(GameConst.SELECTORS.RESPONSE_ERROR);
        form.querySelector(GameConst.SELECTORS.INPUT).addEventListener('focus', () => {
            errorBlock.innerHTML = '';
            let loadingContainer = form.querySelector(GameConst.SELECTORS.LOADING_CONTAINER);
            if(loadingContainer){
                loadingContainer?.classList.add(GameConst.CLASSES.HIDDEN);
            }
        });
    }

}

module.exports.ErrorsBlockHandler = ErrorsBlockHandler;
