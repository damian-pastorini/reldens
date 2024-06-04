/**
 *
 * Reldens - ForgotPasswordFormHandler
 *
 */

const { ErrorsBlockHandler } = require('./errors-block-handler');
const { GameConst } = require('../../constants');

class ForgotPasswordFormHandler
{

    constructor(gameManager)
    {
        this.gameManager = gameManager;
        this.gameDom = this.gameManager.gameDom;
        this.form = this.gameManager.gameDom.getElement(GameConst.SELECTORS.FORGOT_PASSWORD_FORM);
    }

    activateForgotPassword()
    {
        if(!this.form){
            return false;
        }
        if(!this.gameManager.config.get('client/general/users/allowRegistration')){
            this.form.classList.add('hidden');
            return true;
        }
        ErrorsBlockHandler.reset(this.form);
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            ErrorsBlockHandler.reset(this.form);
            if(!this.form.checkValidity()){
                return false;
            }
            this.form.querySelector(GameConst.SELECTORS.LOADING_CONTAINER).classList.remove(GameConst.CLASSES.HIDDEN);
            let formData = {
                formId: this.form.id,
                forgot: true,
                email: this.form.querySelector(GameConst.SELECTORS.FORGOT_PASSWORD.EMAIL).value
            };
            reldens.startGame(formData, false);
        });
    }

    displayForgotPassword()
    {
        this.gameDom.getJSON(this.gameManager.appServerUrl+GameConst.ROUTE_PATHS.MAILER, (err, response) => {
            if(!response.enabled){
                return;
            }
            this.gameDom.getElement(GameConst.SELECTORS.FORGOT_PASSWORD.CONTAINER).classList.remove(
                GameConst.CLASSES.HIDDEN
            );
        });
    }

}

module.exports.ForgotPasswordFormHandler = ForgotPasswordFormHandler;
