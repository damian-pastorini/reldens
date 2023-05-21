/**
 *
 * Reldens - LoginFormHandler
 *
 */

const { ErrorsBlockHandler } = require('./errors-block-handler');
const { GameConst } = require('../../constants');

class LoginFormHandler
{

    constructor(gameManager)
    {
        this.gameManager = gameManager;
        this.form = gameManager.gameDom.getElement(GameConst.SELECTORS.LOGIN_FORM);
    }

    activateLogin()
    {
        if(!this.form){
            return false;
        }
        ErrorsBlockHandler.reset(this.form);
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            ErrorsBlockHandler.reset(this.form);
            if(!this.form.checkValidity()){
                return false;
            }
            if(this.gameManager.submitedForm){
                return false;
            }
            this.gameManager.submitedForm = true;
            this.form.querySelector(GameConst.SELECTORS.LOADING_CONTAINER).classList.remove(GameConst.CLASSES.HIDDEN);
            let formData = {
                formId: this.form.id,
                username: this.form.querySelector(GameConst.SELECTORS.LOGIN.USERNAME).value,
                password: this.form.querySelector(GameConst.SELECTORS.LOGIN.PASSWORD).value
            };
            this.gameManager.startGame(formData, false);
        });
    }

}

module.exports.LoginFormHandler = LoginFormHandler;
