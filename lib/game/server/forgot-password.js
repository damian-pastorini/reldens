/**
 *
 * Reldens - ForgotPassword
 *
 * Handles the forgot password flow. Processes the forgot password requests: limits the requests per address, reserves
 * the reset email sent time on the user so a single email is sent per interval, sends the email with the signed reset
 * link and restores the previous sent time when the email can not be sent. Defines the Express routes of the password
 * reset page (/reset-password), validates the reset tokens, generates the new random passwords, updates the user
 * passwords and renders the success or error templates.
 *
 */

const { GameConst } = require('../constants');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('express').Application} ExpressApplication
 *
 * @typedef {Object} ForgotPasswordProps
 * @property {ConfigManager} config
 * @property {Mailer} mailer
 * @property {UsersManager} usersManager
 * @property {ThemeManager} themeManager
 * @property {EventsManager} events
 * @property {LoginAttempts} loginAttempts
 * @property {ExpiringHmacToken} expiringHmacToken
 * @property {Encryptor} passwordManager
 */
class ForgotPassword
{

    /**
     * @param {ForgotPasswordProps} props
     */
    constructor(props)
    {
        /** @type {ConfigManager} */
        this.config = props.config;
        /** @type {Mailer} */
        this.mailer = props.mailer;
        /** @type {UsersManager} */
        this.usersManager = props.usersManager;
        /** @type {ThemeManager} */
        this.themeManager = props.themeManager;
        /** @type {EventsManager} */
        this.events = props.events;
        /** @type {LoginAttempts} */
        this.loginAttempts = props.loginAttempts;
        /** @type {ExpiringHmacToken} */
        this.expiringHmacToken = props.expiringHmacToken;
        /** @type {Encryptor} */
        this.passwordManager = props.passwordManager;
        /** @type {number} */
        this.requestsMaxPerIp = this.config.getWithoutLogs('server/security/registration/maxPerIp', 10);
        /** @type {number} */
        this.forgotPasswordLimit = Number(this.config.getWithoutLogs('server/mailer/forgotPasswordLimit', 4));
    }

    /**
     * @param {ExpressApplication} app
     */
    defineResetPasswordRoutes(app)
    {
        app.get(GameConst.ROUTE_PATHS.RESET_PASSWORD, async (req, res) => {
            let requestEmail = sc.get(req.query, 'email', '');
            let requestToken = sc.get(req.query, 'token', '');
            let user = await this.loadUserByValidToken(requestEmail, requestToken);
            if(!user){
                return res.send(await this.renderLayout(await this.themeManager.loadAndRenderTemplate(
                    this.themeManager.assetPath('email', 'reset-error.html')
                )));
            }
            return res.send(await this.renderLayout(
                await this.themeManager.loadAndRenderTemplate(
                    this.themeManager.assetPath('email', 'reset-form.html'),
                    {email: requestEmail, token: requestToken}
                )
            ));
        });
        app.post(GameConst.ROUTE_PATHS.RESET_PASSWORD, async (req, res) => {
            return res.send(await this.renderLayout(
                await this.resetResultContent(sc.get(req.body, 'email', ''), sc.get(req.body, 'token', ''))
            ));
        });
    }

    /**
     * @param {Object<string, any>} userData
     * @param {string} [requestAddress]
     * @returns {Promise<{error: string}>}
     */
    async processForgotPassword(userData, requestAddress = '')
    {
        // @TODO - WIP - TRANSLATIONS.
        if(!this.mailer.isEnabled()){
            return {error: 'The forgot password email can not be send, please contact the administrator.'};
        }
        if(!sc.isString(sc.get(userData, 'email', '')) || '' === sc.get(userData, 'email', '')){
            return {error: 'Please complete your email.'};
        }
        let existsMessage = {error: 'If the email exists then a reset password link should be received soon.'};
        let now = Date.now();
        let forgotAddressKey = GameConst.LOGIN_ATTEMPTS_KEYS.FORGOT_ADDRESS;
        if(this.loginAttempts.isAddressLimitReached(forgotAddressKey, requestAddress, this.requestsMaxPerIp, now)){
            Logger.warning('Forgot password limit reached for the request address.');
            return existsMessage;
        }
        let user = await this.usersManager.loadUserByEmail(userData.email);
        if(!user){
            return existsMessage;
        }
        let intervalStartTime = now - (this.forgotPasswordLimit * 60 * 60 * 1000);
        if(!await this.usersManager.reservePasswordResetSentTime(user.email, now, intervalStartTime)){
            Logger.debug('Reset link already sent to "'+userData.email+'".');
            return existsMessage;
        }
        let sendResult = {result: await this.sendForgotPasswordEmail(userData, user.password)};
        Logger.debug('Reset link send result for "'+userData.email+'".', sendResult);
        if(!sendResult.result){
            await this.usersManager.updateUserByEmail(
                user.email,
                {password_reset_sent_at: sc.get(user, 'password_reset_sent_at', null)}
            );
        }
        this.events.emitSync('reldens.processForgotPassword', this, userData, sendResult);
        return existsMessage;
    }

    /**
     * @param {Object<string, any>} userData
     * @param {string} oldPassword
     * @returns {Promise<boolean>}
     */
    async sendForgotPasswordEmail(userData, oldPassword)
    {
        // @TODO - WIP - TRANSLATIONS.
        let emailPath = this.themeManager.assetPath('email', 'forgot.html');
        let serverUrl = this.config.server.publicUrl || this.config.server.baseUrl;
        let token = this.expiringHmacToken.generate(
            [userData.email, oldPassword],
            Date.now()+GameConst.SIGNED_TOKENS.RESET_PASSWORD_EXPIRATION
        );
        if(!token){
            Logger.error('Reset password token could not be generated, check the signed tokens secret.');
            return false;
        }
        let resetLink = serverUrl+GameConst.ROUTE_PATHS.RESET_PASSWORD
            +'?email='+encodeURIComponent(userData.email)+'&token='+token;
        let subject = this.config.getWithoutLogs('server/mailer/forgotPassword/subject', 'Forgot password');
        let content = await this.themeManager.loadAndRenderTemplate(emailPath, {resetLink: resetLink});
        // @TODO - BETA - Make all system messages configurable.
        try {
            return await this.mailer.sendEmail({
                from: this.mailer.from,
                to: userData.email,
                subject,
                html: content
            });
        } catch (error) {
            Logger.error('Forgot password email could not be sent: '+error.message);
            return false;
        }
    }

    /**
     * @param {string} requestEmail
     * @param {string} requestToken
     * @returns {Promise<Object|false>}
     */
    async loadUserByValidToken(requestEmail, requestToken)
    {
        if(!sc.isString(requestEmail) || '' === requestEmail){
            return false;
        }
        if(!sc.isString(requestToken) || '' === requestToken){
            return false;
        }
        let user = await this.usersManager.loadUserByEmail(requestEmail);
        if(!user){
            return false;
        }
        if(!this.expiringHmacToken.validate([requestEmail, user.password], requestToken, Date.now())){
            return false;
        }
        return user;
    }

    /**
     * @param {string} content
     * @returns {Promise<string>}
     */
    async renderLayout(content)
    {
        return this.themeManager.templateEngine.render(
            FileHandler.fetchFileContents(FileHandler.joinPaths(
                this.themeManager.projectAssetsPath,
                'html',
                'layout.html'
            )),
            {content, contentKey: 'forgot-password-content'}
        );
    }

    /**
     * @param {string} requestEmail
     * @param {string} requestToken
     * @returns {Promise<string>}
     */
    async resetResultContent(requestEmail, requestToken)
    {
        let user = await this.loadUserByValidToken(requestEmail, requestToken);
        if(!user){
            return await this.themeManager.loadAndRenderTemplate(
                this.themeManager.assetPath('email', 'reset-error.html')
            );
        }
        let newPass = sc.randomCharsWithSymbols(12);
        let newPassHash = this.passwordManager.encryptPassword(newPass);
        await this.usersManager.updateUserByEmail(requestEmail, {password: newPassHash});
        return await this.themeManager.loadAndRenderTemplate(
            this.themeManager.assetPath('email', 'reset-success.html'),
            {userName: user.username, newPass}
        );
    }

}

module.exports.ForgotPassword = ForgotPassword;
