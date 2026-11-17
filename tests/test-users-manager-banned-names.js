/**
 *
 * Reldens - Test Users Manager Banned Names
 *
 */

const { BaseTest } = require('./base-test');
const { UsersManager } = require('../lib/users/server/manager');

class TestUsersManagerBannedNames extends BaseTest
{

    createUsersManager(bannedNames)
    {
        let usersManager = Object.create(UsersManager.prototype);
        usersManager.bannedNames = usersManager.mapBannedNames(bannedNames);
        usersManager.allowDuplicateGuestNames = false;
        usersManager.checkedNames = [];
        usersManager.playersRepository = {
            loadOneBy: async (field, playerName) => usersManager.checkedNames.push(playerName) && false
        };
        return usersManager;
    }

    async testTheBannedNamesAreAListOfCleanNames()
    {
        await this.test('the banned names text becomes a list of trimmed lower case names', async () => {
            let usersManager = Object.create(UsersManager.prototype);
            this.assert.deepStrictEqual(
                usersManager.mapBannedNames(' Admin, moderator,,ROOT '),
                ['admin', 'moderator', 'root']
            );
            for(let emptyValue of ['', ' , ', false]){
                this.assert.deepStrictEqual(usersManager.mapBannedNames(emptyValue), []);
            }
        });
    }

    async testABannedNameIsRejectedInAnyLetterCase()
    {
        await this.test('a banned name is rejected in any letter case without loading the players', async () => {
            let usersManager = this.createUsersManager('admin,moderator');
            for(let bannedName of ['admin', 'Admin', 'MODERATOR']){
                this.assert.strictEqual(await usersManager.isNameAvailable(bannedName), false);
            }
            this.assert.deepStrictEqual(usersManager.checkedNames, []);
        });
    }

    async testANamePartOfABannedNameIsNotBanned()
    {
        await this.test('a name that is only a part of a banned name, or contains one, is not banned', async () => {
            let usersManager = this.createUsersManager('admin,moderator');
            for(let playerName of ['adm', 'administrator', 'mod']){
                this.assert.strictEqual(await usersManager.isNameAvailable(playerName), true);
            }
            this.assert.deepStrictEqual(usersManager.checkedNames, ['adm', 'administrator', 'mod']);
        });
    }

    async testNoBannedNamesBanNothing()
    {
        await this.test('without banned names every name goes to the players check', async () => {
            let usersManager = this.createUsersManager('');
            this.assert.strictEqual(await usersManager.isNameAvailable('admin'), true);
            this.assert.deepStrictEqual(usersManager.checkedNames, ['admin']);
        });
    }

}

module.exports.TestUsersManagerBannedNames = TestUsersManagerBannedNames;
