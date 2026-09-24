/**
 *
 * Reldens - ForgotPassword
 *
 * Handles the forgot password flow. Processes the forgot password requests: limits the requests per address, reserves
 * the reset email sent time on the user so a single email is sent per interval, sends the email with the signed reset
 * link and restores the previous sent time when the email can not be sent. Defines the Express routes of the password
 * reset page (/reset-password), validates the reset tokens and the submitted passwords with the password policy,
 * replaces the user password only when it did not change since the link was validated, so a link is consumed once, and
 * renders the success or error templates.
 *
 */

const { GameConst } = require('../constants');
const { PasswordPolicy } = require('../../users/password-policy');
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
        /** @type {number} */
        this.passwordMaximumLength = Number(this.config.getWithoutLogs('server/security/passwordMaximumLength', 128));
    }

    /**
     * @param {ExpressApplication} app
     */
    defineResetPasswordRoutes(app)
    {
        app.get(GameConst.ROUTE_PATHS.RESET_PASSWORD, async (req, res) => {
            try {
                return res.send(await this.renderLayout(
                    await this.resetFormContent(sc.get(req.query, 'email', ''), sc.get(req.query, 'token', ''))
                ));
            } catch (error) {
                Logger.error('Reset password request error.', error.message);
                return res.status(500).send('Reset password error.');
            }
        });
        app.post(GameConst.ROUTE_PATHS.RESET_PASSWORD, async (req, res) => {
            try {
                return res.send(await this.renderLayout(await this.resetResultContent(
                    sc.get(req.body, 'email', ''),
                    sc.get(req.body, 'token', ''),
                    sc.get(req.body, 'password', ''),
                    sc.get(req.body, 're-password', '')
                )));
            } catch (error) {
                Logger.error('Reset password request error.', error.message);
                return res.status(500).send('Reset password error.');
            }
        });
    }

    /**
     * @param {string} requestEmail
     * @param {string} requestToken
     * @returns {Promise<string>}
     */
    async resetFormContent(requestEmail, requestToken)
    {
        return await this.themeManager.loadAndRenderTemplate(
            this.themeManager.assetPath(
                'email',
                await this.loadUserByValidToken(requestEmail, requestToken) ? 'reset-form.html' : 'reset-error.html'
            ),
            {email: requestEmail, token: requestToken}
        );
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
     * @param {string} newPassword
     * @param {string} rePassword
     * @returns {Promise<string>}
     */
    async resetResultContent(requestEmail, requestToken, newPassword, rePassword)
    {
        let user = await this.loadUserByValidToken(requestEmail, requestToken);
        return await this.themeManager.loadAndRenderTemplate(
            this.themeManager.assetPath(
                'email',
                user && await this.replaceUserPassword(user, newPassword, rePassword)
                    ? 'reset-success.html'
                    : 'reset-error.html'
            ),
            {userName: sc.get(user, 'username', '')}
        );
    }

    /**
     * @param {Object} user
     * @param {string} newPassword
     * @param {string} rePassword
     * @returns {Promise<boolean>}
     */
    async replaceUserPassword(user, newPassword, rePassword)
    {
        if(newPassword !== rePassword){
            return false;
        }
        let minimumLength = PasswordPolicy.fetchMinimumLength(this.config);
        if(!PasswordPolicy.isValid(newPassword, minimumLength, this.passwordMaximumLength)){
            return false;
        }
        return await this.usersManager.replacePasswordIfUnchanged(
            user.id,
            user.password,
            this.passwordManager.encryptPassword(newPassword)
        );
    }

}

module.exports.ForgotPassword = ForgotPassword;
