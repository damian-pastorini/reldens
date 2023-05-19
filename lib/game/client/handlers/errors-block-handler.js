/**
 *
 * Reldens - ErrorsBlockHandler
 *
 */

const { GameConst } = require('../../constants');

class ErrorsBlockHandler
{

    static reset(submittedForm)
    {
        let errorBlock = submittedForm.querySelector(GameConst.SELECTORS.RESPONSE_ERROR);
        submittedForm.querySelector(GameConst.SELECTORS.INPUT).addEventListener('focus', () => {
            errorBlock.innerHTML = '';
        });
    }

}

module.exports.ErrorsBlockHandler = ErrorsBlockHandler;
