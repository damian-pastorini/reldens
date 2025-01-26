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
        if(!form){
            return false;
        }
        let errorBlock = form.querySelector(GameConst.SELECTORS.RESPONSE_ERROR);
        if(!errorBlock){
            return false;
        }
        let inputElement = form.querySelector(GameConst.SELECTORS.INPUT);
        if(!inputElement){
            return false;
        }
        inputElement.addEventListener('focus', () => {
            errorBlock.innerHTML = '';
            let loadingContainer = form.querySelector(GameConst.SELECTORS.LOADING_CONTAINER);
            if(loadingContainer){
                loadingContainer?.classList.add(GameConst.CLASSES.HIDDEN);
            }
        });
    }

}

module.exports.ErrorsBlockHandler = ErrorsBlockHandler;
