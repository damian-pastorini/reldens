/**
 *
 * Reldens - ClientStartHandler
 *
 * Initializes all client-side form handlers for the game start screen. Activates registration,
 * guest login, terms and conditions, regular login, and forgot password forms. Initializes Firebase
 * authentication if configured. Stores form handler instances in GameManager elements for access
 * throughout the application. Emits clientStartAfter event for custom initialization hooks.
 *
 */

const { RegistrationFormHandler } = require('./registration-form-handler');
const { TermsAndConditionsHandler } = require('./terms-and-conditions-handler');
const { LoginFormHandler } = require('./login-form-handler');
const { ForgotPasswordFormHandler } = require('./forgot-password-form-handler');
const { GuestFormHandler } = require('./guest-form-handler');

class ClientStartHandler
{

    /**
     * @param {GameManager} gameManager
     */
    constructor(gameManager)
    {
        /** @type {GameManager} */
        this.gameManager = gameManager;
    }

    clientStart()
    {
        let registrationForm = new RegistrationFormHandler(this.gameManager);
        registrationForm.activateRegistration();
        let guestForm = new GuestFormHandler(this.gameManager);
        guestForm.activateGuest();
        let termsAndConditions = new TermsAndConditionsHandler(this.gameManager);
        termsAndConditions.activateTermsAndConditions();
        let loginForm = new LoginFormHandler(this.gameManager);
        loginForm.activateLogin();
        let forgotPasswordForm = new ForgotPasswordFormHandler(this.gameManager);
        forgotPasswordForm.activateForgotPassword();
        forgotPasswordForm.displayForgotPassword();
        if(this.gameManager.firebase){
            this.gameManager.firebase.startFirebase();
        }
        Object.assign(this.gameManager.elements, {
            registrationForm,
            termsAndConditions,
            loginForm,
            forgotPasswordForm
        });
        this.gameManager.events.emitSync('reldens.clientStartAfter', this);
    }

}

module.exports.ClientStartHandler = ClientStartHandler;
