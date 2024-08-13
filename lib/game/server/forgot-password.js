/**
 *
 * Reldens - ForgotPassword
 *
 */

const { FileHandler } = require('./file-handler');
const { sc } = require('@reldens/utils');

class ForgotPassword
{

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
