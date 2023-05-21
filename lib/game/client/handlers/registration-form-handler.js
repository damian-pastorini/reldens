/**
 *
 * Reldens - RegistrationHandler
 *
 */

const { ErrorsBlockHandler } = require('./errors-block-handler');
const { GameConst } = require('../../constants');

class RegistrationFormHandler
{

    constructor(gameManager)
    {
        this.gameManager = gameManager;
        this.gameDom = this.gameManager.gameDom;
        this.form = gameManager.gameDom.getElement(GameConst.SELECTORS.REGISTER_FORM);
    }

    activateRegistration()
    {
        if(!this.form){
            return false;
        }
        ErrorsBlockHandler.reset(this.form);
        let selectors = GameConst.SELECTORS;
        let acceptTermsCheckbox = this.gameDom.getElement(selectors.TERMS.ACCEPT);
        let termsContainer = this.gameDom.getElement(selectors.TERMS.BOX);
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            if(!this.form.checkValidity()){
                return false;
            }
            let password = this.gameDom.getElement(selectors.REGISTRATION.PASSWORD).value;
            let rePassword = this.gameDom.getElement(selectors.REGISTRATION.RE_PASSWORD).value;
            let responseErrorBlock = this.form.querySelector(selectors.RESPONSE_ERROR);
            if(password !== rePassword && responseErrorBlock){
                // @TODO - BETA - Replace texts by configured translations.
                responseErrorBlock.innerHTML = 'Password and confirmation does not match.';
                return false;
            }
            if(!acceptTermsCheckbox.checked && responseErrorBlock){
                // @TODO - BETA - Replace texts by configured translations.
                responseErrorBlock.innerHTML = ' Please read and accept the terms and conditions and continue.';
                return false;
            }
            termsContainer?.classList.add(GameConst.CLASSES.HIDDEN);
            this.form.querySelector(selectors.LOADING_CONTAINER).classList.remove(GameConst.CLASSES.HIDDEN);
            let formData = {
                formId: this.form.id,
                email: this.gameDom.getElement(selectors.REGISTRATION.EMAIL).value,
                username: this.gameDom.getElement(selectors.REGISTRATION.USERNAME).value,
                password: password,
                rePassword: rePassword
            };
            this.gameManager.startGame(formData, true);
        });
    }

}

module.exports.RegistrationFormHandler = RegistrationFormHandler;
