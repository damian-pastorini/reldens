/**
 *
 * Reldens - ClientStartHandler
 *
 */

const { RegistrationFormHandler } = require('./registration-form-handler');
const { TermsAndConditionsHandler } = require('./terms-and-conditions-handler');
const { LoginFormHandler } = require('./login-form-handler');
const { ForgotPasswordFormHandler } = require('./forgot-password-form-handler');
const { FullScreenHandler } = require('./full-screen-handler');

class ClientStartHandler
{

    constructor(gameManager)
    {
        this.gameManager = gameManager;
    }

    clientStart()
    {
        let registrationForm = new RegistrationFormHandler(this.gameManager);
        registrationForm.activateRegistration();
        let termsAndConditions = new TermsAndConditionsHandler(this.gameManager);
        termsAndConditions.activateTermsAndConditions();
        let loginForm = new LoginFormHandler(this.gameManager);
        loginForm.activateLogin();
        let forgotPasswordForm = new ForgotPasswordFormHandler(this.gameManager);
        forgotPasswordForm.activateForgotPassword();
        forgotPasswordForm.displayForgotPassword();
        let fullScreen = new FullScreenHandler(this.gameManager);
        fullScreen.activateFullScreen();
        if(this.gameManager.firebase){
            this.gameManager.firebase.startFirebase();
        }
        Object.assign(this.gameManager.elements, {
            registrationForm,
            termsAndConditions,
            loginForm,
            forgotPasswordForm,
            fullScreen
        });
        this.gameManager.events.emitSync('reldens.clientStartAfter', this);
    }

}

module.exports.ClientStartHandler = ClientStartHandler;
