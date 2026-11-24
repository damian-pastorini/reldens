/**
 *
 * Reldens - Test Users Manager Banned Names
 *
 * Tests the player name checks of the UsersManager: the banned names list, a banned name rejected in any letter case,
 * a name that only contains or is part of a banned name allowed, and server/players/allowDuplicateGuestNames: off, a
 * name stored for any player is taken (ISSUE #182); on, a name stored only for guests is free and a registered user
 * name is taken.
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

    async fetchNamesAvailability(usersManager, playerNames)
    {
        let namesAvailability = [];
        for(let playerName of playerNames){
            namesAvailability.push(await usersManager.isNameAvailable(playerName));
        }
        return namesAvailability;
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
            this.assert.deepStrictEqual(
                await this.fetchNamesAvailability(usersManager, ['admin', 'Admin', 'MODERATOR']),
                [false, false, false]
            );
            this.assert.deepStrictEqual(usersManager.checkedNames, []);
        });
    }

    async testANamePartOfABannedNameIsNotBanned()
    {
        await this.test('a name that is only a part of a banned name, or contains one, is not banned', async () => {
            let usersManager = this.createUsersManager('admin,moderator');
            this.assert.deepStrictEqual(
                await this.fetchNamesAvailability(usersManager, ['adm', 'administrator', 'mod']),
                [true, true, true]
            );
            this.assert.deepStrictEqual(usersManager.checkedNames, ['adm', 'administrator', 'mod']);
        });
    }

    createStoredNamesManager(allowDuplicateGuestNames)
    {
        let usersManager = this.createUsersManager('');
        let guestRoleId = 3;
        let storedPlayers = [
            {name: 'guest-name', related_users: {role_id: guestRoleId}},
            {name: 'user-name', related_users: {role_id: 2}}
        ];
        usersManager.guestRoleId = guestRoleId;
        usersManager.allowDuplicateGuestNames = allowDuplicateGuestNames;
        usersManager.playersRepository = {
            loadOneBy: async (field, playerName) => storedPlayers.find(player => playerName === player.name) || false,
            loadByWithRelations: async (field, playerName) => storedPlayers.filter(player => playerName === player.name)
        };
        return usersManager;
    }

    async testTheDuplicateGuestNamesOption()
    {
        await this.test('with the duplicate guest names off any stored name is taken, with it on only a registered user name is', async () => {
            let checkedNames = ['guest-name', 'user-name', 'free-name'];
            for(let optionCase of [{isAllowed: false, available: [false, false, true]}, {isAllowed: true, available: [true, false, true]}]){
                this.assert.deepStrictEqual(
                    await this.fetchNamesAvailability(this.createStoredNamesManager(optionCase.isAllowed), checkedNames),
                    optionCase.available,
                    'Duplicate guest names '+optionCase.isAllowed
                );
            }
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
