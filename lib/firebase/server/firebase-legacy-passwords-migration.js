/**
 *
 * Reldens - FirebaseLegacyPasswordsMigration
 *
 * Migrates the accounts created by the legacy Firebase login, which stored the hash of the Firebase user ID as the
 * password, so the user ID no longer works on the regular login form. Reads a "firebase auth:export" JSON file and,
 * for every exported user whose stored password validates against its Firebase user ID, replaces the password with the
 * hash of the password derived from the user ID and the server secret, the same one the verified Firebase login uses.
 *
 */

const { FileHandler, Encryptor } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {Object} FirebaseLegacyPasswordsMigrationProps
 * @property {Object} usersRepository
 * @property {FirebaseIdTokenVerifier} idTokenVerifier
 */
class FirebaseLegacyPasswordsMigration
{

    /**
     * @param {FirebaseLegacyPasswordsMigrationProps} props
     */
    constructor(props)
    {
        /** @type {Object} */
        this.usersRepository = sc.get(props, 'usersRepository', false);
        /** @type {FirebaseIdTokenVerifier} */
        this.idTokenVerifier = sc.get(props, 'idTokenVerifier', false);
    }

    /**
     * @param {string} exportFilePath
     * @returns {Promise<number|false>}
     */
    async migrate(exportFilePath)
    {
        let exportData = FileHandler.fetchFileJson(exportFilePath);
        if(!exportData){
            Logger.critical('The Firebase export file could not be read: '+exportFilePath);
            return false;
        }
        let migratedUsers = 0;
        for(let exportedUser of sc.get(exportData, 'users', [])){
            if(await this.migrateUser(sc.get(exportedUser, 'localId', ''), sc.get(exportedUser, 'email', ''))){
                migratedUsers++;
            }
        }
        Logger.info('Migrated '+migratedUsers+' legacy Firebase account passwords.');
        return migratedUsers;
    }

    /**
     * @param {string} firebaseUid
     * @param {string} email
     * @returns {Promise<boolean>}
     */
    async migrateUser(firebaseUid, email)
    {
        if('' === firebaseUid){
            return false;
        }
        if('' === email){
            return false;
        }
        let user = await this.usersRepository.loadOneBy('email', email);
        if(!user){
            return false;
        }
        if(!await Encryptor.validatePassword(firebaseUid, user.password)){
            return false;
        }
        let derivedPassword = this.idTokenVerifier.derivePassword(firebaseUid);
        if(!derivedPassword){
            return false;
        }
        return Boolean(
            await this.usersRepository.updateById(user.id, {password: Encryptor.encryptPassword(derivedPassword)})
        );
    }

}

module.exports.FirebaseLegacyPasswordsMigration = FirebaseLegacyPasswordsMigration;
