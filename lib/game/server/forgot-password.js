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
        serverManager.app.use('/reset-password', async (req, res) => {
            let rEmail = req.query.email;
            let rId = req.query.id;
            let user = false;
            if(rEmail && rId){
                user = await serverManager.usersManager.loadUserByEmail(rEmail);
            }
            let content = await this.resetResultContent(user, rId, serverManager, rEmail);
            res.send(
                await serverManager.themeManager.templateEngine.render(
                    FileHandler.fetchFileContents(FileHandler.joinPaths(
                        serverManager.themeManager.projectAssetsPath,
                        'html',
                        'layout.html'
                    )),
                    {content, contentKey: 'forgot-password-content'}
                )
            );
        });
    }

    /**
     * @param {Object|false} user
     * @param {string} rId
     * @param {ServerManager} serverManager
     * @param {string} rEmail
     * @returns {Promise<string>}
     */
    static async resetResultContent(user, rId, serverManager, rEmail)
    {
        if(!user || user.password !== rId){
            return await serverManager.themeManager.loadAndRenderTemplate(
                serverManager.themeManager.assetPath('email', 'reset-error.html')
            );
        }
        let newPass = sc.randomCharsWithSymbols(12);
        let newPassHash = serverManager.loginManager.passwordManager.encryptPassword(newPass);
        await serverManager.usersManager.updateUserByEmail(rEmail, {password: newPassHash});
        return await serverManager.themeManager.loadAndRenderTemplate(
            serverManager.themeManager.assetPath('email', 'reset-success.html'),
            {userName: user.username, newPass}
        );
    }
}

module.exports.ForgotPassword = ForgotPassword;
