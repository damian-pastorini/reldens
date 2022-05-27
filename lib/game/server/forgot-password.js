/**
 *
 * Reldens - ForgotPassword
 *
 */

const { sc } = require('@reldens/utils');

class ForgotPassword
{

    static async defineRequestOnServerManagerApp(serverManager)
    {
        serverManager.app.use('/reset-password', async (req, res) => {
            let rEmail = req.query.email;
            let rId = req.query.id;
            let user = false;
            let resetResult = '';
            if(rEmail && rId){
                user = await serverManager.usersManager.loadUserByEmail(rEmail);
            }
            resetResult = await this.resetResultContent(user, rId, serverManager, rEmail);
            let resetPath = serverManager.themeManager.assetPath('email', 'reset.html');
            let content = await serverManager.themeManager.loadAndRenderTemplate(resetPath, {resetResult});
            res.send(content);
        });
    }

    static async resetResultContent(user, rId, serverManager, rEmail)
    {
        if(!user || user.password !== rId){
            let resetErrorPath = serverManager.themeManager.assetPath('email', 'reset-error.html');
            return await serverManager.themeManager.loadAndRenderTemplate(resetErrorPath);
        }
        let newPass = sc.randomCharsWithSymbols(12);
        let newPassHash = serverManager.loginManager.passwordManager.encryptPassword(newPass);
        await serverManager.usersManager.updateUserByEmail(rEmail, {password: newPassHash});
        let resetSuccessPath = serverManager.themeManager.assetPath('email', 'reset-success.html');
        return await serverManager.themeManager.loadAndRenderTemplate(resetSuccessPath, {newPass});
    }
}

module.exports.ForgotPassword = ForgotPassword;
