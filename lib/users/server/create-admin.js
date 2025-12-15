/**
 *
 * Reldens - CreateAdmin
 *
 * Service for creating admin users via CLI command.
 *
 */

const { Encryptor } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class CreateAdmin
{

    /**
     * @param {Object} serverManager
     */
    constructor(serverManager)
    {
        /** @type {Object} */
        this.serverManager = serverManager;
        /** @type {Object} */
        this.usersRepository = this.serverManager.dataServer.getEntity('users');
        /** @type {string|null} */
        this.error = null;
    }

    /**
     * @param {string} username
     * @param {string} password
     * @param {string} email
     * @returns {Promise<boolean>}
     */
    async create(username, password, email)
    {
        this.error = null;
        if(!sc.isString(username) || !sc.isString(password) || !sc.isString(email)){
            this.error = 'Invalid parameters for createAdmin command.';
            Logger.critical(this.error);
            return false;
        }
        if(!sc.validateInput(email, 'email')){
            this.error = 'Invalid email format: '+email;
            Logger.critical(this.error);
            return false;
        }
        let adminRoleId = this.serverManager.configManager.getWithoutLogs('server/admin/roleId', 1);
        let encryptedPassword = Encryptor.encryptPassword(password);
        if(!encryptedPassword){
            this.error = 'Failed to encrypt password.';
            Logger.critical(this.error);
            return false;
        }
        let newUser = await this.usersRepository.create({
            email,
            username,
            password: encryptedPassword,
            role_id: adminRoleId,
            status: 1
        });
        if(!newUser){
            this.error = 'Failed to create admin user.';
            Logger.critical(this.error);
            return false;
        }
        Logger.info('Admin user created successfully.', {username, email, role_id: adminRoleId});
        return true;
    }

}

module.exports.CreateAdmin = CreateAdmin;
