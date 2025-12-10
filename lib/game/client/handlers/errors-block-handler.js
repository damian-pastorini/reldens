/**
 *
 * Reldens - ErrorsBlockHandler
 *
 * Utility class for managing error message blocks in forms. Provides a static method to reset error
 * displays when users focus on form input fields, clearing error messages and hiding loading indicators.
 *
 */

const { GameConst } = require('../../constants');

class ErrorsBlockHandler
{

    /**
     * @param {HTMLFormElement} form
     * @returns {boolean}
     */
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
