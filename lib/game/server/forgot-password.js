/**
 *
 * Reldens - ForgotPassword
 *
 * Static utility class for handling password reset functionality. Defines Express routes for the
 * password reset page (/reset-password), validates reset tokens (old password hash), generates
 * new random passwords, updates user passwords in the database, and renders success/error templates.
 * Works in conjunction with LoginManager's forgot password email sending and Mailer service.
 *
 */

const { GameConst } = require('../constants');
const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class ForgotPassword
{

    /**
     * @param {ServerManager} serverManager
     * @returns {Promise<void>}
     */
    static async defineRequestOnServerManagerApp(serverManager)
    {
        serverManager.app.get(GameConst.ROUTE_PATHS.RESET_PASSWORD, async (req, res) => {
            let requestEmail = sc.get(req.query, 'email', '');
            let requestToken = sc.get(req.query, 'token', '');
            let user = await this.loadUserByValidToken(serverManager, requestEmail, requestToken);
            if(!user){
                return res.send(await this.renderLayout(serverManager, await this.renderErrorContent(serverManager)));
            }
            return res.send(await this.renderLayout(
                serverManager,
                await serverManager.themeManager.loadAndRenderTemplate(
                    serverManager.themeManager.assetPath('email', 'reset-form.html'),
                    {email: requestEmail, token: requestToken}
                )
            ));
        });
        serverManager.app.post(GameConst.ROUTE_PATHS.RESET_PASSWORD, async (req, res) => {
            return res.send(await this.renderLayout(
                serverManager,
                await this.resetResultContent(
                    serverManager,
                    sc.get(req.body, 'email', ''),
                    sc.get(req.body, 'token', '')
                )
            ));
        });
    }

    /**
     * @param {ServerManager} serverManager
     * @param {string} requestEmail
     * @param {string} requestToken
     * @returns {Promise<Object|false>}
     */
    static async loadUserByValidToken(serverManager, requestEmail, requestToken)
    {
        if(!sc.isString(requestEmail) || '' === requestEmail){
            return false;
        }
        if(!sc.isString(requestToken) || '' === requestToken){
            return false;
        }
        let user = await serverManager.usersManager.loadUserByEmail(requestEmail);
        if(!user){
            return false;
        }
        let tokenValues = [requestEmail, user.password];
        if(!serverManager.loginManager.expiringHmacToken.validate(tokenValues, requestToken, Date.now())){
            return false;
        }
        return user;
    }

    /**
     * @param {ServerManager} serverManager
     * @param {string} content
     * @returns {Promise<string>}
     */
    static async renderLayout(serverManager, content)
    {
        return serverManager.themeManager.templateEngine.render(
            FileHandler.fetchFileContents(FileHandler.joinPaths(
                serverManager.themeManager.projectAssetsPath,
                'html',
                'layout.html'
            )),
            {content, contentKey: 'forgot-password-content'}
        );
    }

    /**
     * @param {ServerManager} serverManager
     * @returns {Promise<string>}
     */
    static async renderErrorContent(serverManager)
    {
        return await serverManager.themeManager.loadAndRenderTemplate(
            serverManager.themeManager.assetPath('email', 'reset-error.html')
        );
    }

    /**
     * @param {ServerManager} serverManager
     * @param {string} requestEmail
     * @param {string} requestToken
     * @returns {Promise<string>}
     */
    static async resetResultContent(serverManager, requestEmail, requestToken)
    {
        let user = await this.loadUserByValidToken(serverManager, requestEmail, requestToken);
        if(!user){
            return await this.renderErrorContent(serverManager);
        }
        let newPass = sc.randomCharsWithSymbols(12);
        let newPassHash = serverManager.loginManager.passwordManager.encryptPassword(newPass);
        await serverManager.usersManager.updateUserByEmail(requestEmail, {password: newPassHash});
        return await serverManager.themeManager.loadAndRenderTemplate(
            serverManager.themeManager.assetPath('email', 'reset-success.html'),
            {userName: user.username, newPass}
        );
    }
}

module.exports.ForgotPassword = ForgotPassword;
