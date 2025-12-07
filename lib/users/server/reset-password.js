/**
 *
 * Reldens - ResetPassword
 *
 */

const { Encryptor } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class ResetPassword
{

    constructor(serverManager)
    {
        this.serverManager = serverManager;
        this.usersRepository = this.serverManager.dataServer.getEntity('users');
        this.error = null;
    }

    async reset(username, newPassword)
    {
        this.error = null;
        if(!sc.isString(username) || !sc.isString(newPassword)){
            this.error = 'Invalid parameters for resetPassword command.';
            Logger.critical(this.error);
            return false;
        }
        let encryptedPassword = Encryptor.encryptPassword(newPassword);
        if(!encryptedPassword){
            this.error = 'Failed to encrypt password.';
            Logger.critical(this.error);
            return false;
        }
        let user = await this.usersRepository.loadOneBy('username', username);
        if(!user){
            this.error = 'User not found: '+username;
            Logger.critical(this.error);
            return false;
        }
        let updateResult = await this.usersRepository.updateById(user.id, {password: encryptedPassword});
        if(!updateResult){
            this.error = 'Failed to reset password for user: '+username;
            Logger.critical(this.error);
            return false;
        }
        Logger.info('Password reset successfully for user: '+username);
        return true;
    }

}

module.exports.ResetPassword = ResetPassword;
