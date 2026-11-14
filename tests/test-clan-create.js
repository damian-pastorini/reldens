/**
 *
 * Reldens - Test Clan Create
 *
 * Tests the clan create answers with the storage stubbed: no stored clan level answers the level issue and stores no
 * clan; a clan row storage error answers the create error; an owner membership not stored, returned as false or thrown,
 * answers the owner error and deletes the created clan row, so no orphan clan stays; a clan not loaded after its
 * creation answers the create error, deletes the owner membership and the clan row and leaves the player with no clan;
 * and a created and loaded clan answers the success with the clan id and joins its owner.
 *
 */

const { BaseTest } = require('./base-test');
const { ClanFixturesBuilder } = require('./fixtures/clan-fixtures-builder');
const { ClanCreate } = require('../lib/teams/server/message-actions/clan-create');
const { TeamsConst } = require('../lib/teams/constants');

class TestClanCreate extends BaseTest
{

    createSetup(storageResults)
    {
        let setup = {sentMessages: [], storageCalls: [], teamsPlugin: {clans: {}}};
        setup.teamsPlugin.dataServer = {getEntity: (entityKey) => this.createRepository(entityKey, storageResults, setup)};
        setup.client = {send: (type, message) => setup.sentMessages.push(message)};
        setup.room = {config: {getWithoutLogs: (path, defaultValue) => defaultValue, get: () => ({})}};
        setup.playerSchema = ClanFixturesBuilder.createOwnerSchema();
        setup.playerSchema.privateData.clan = false;
        return setup;
    }

    createRepository(entityKey, storageResults, setup)
    {
        return {
            limit: 0,
            sortBy: false,
            loadOne: async () => storageResults.firstLevel,
            loadOneBy: async () => false,
            loadByIdWithRelations: async () => storageResults.clanModel,
            create: async (row) => {
                setup.storageCalls.push({entityKey, created: row});
                return await storageResults[entityKey](row);
            },
            delete: async (filters) => setup.storageCalls.push({entityKey, deleted: filters}),
            deleteById: async (id) => setup.storageCalls.push({entityKey, deletedId: id})
        };
    }

    createStorageResults(overrides)
    {
        return Object.assign({
            firstLevel: {id: 1, key: 1},
            clanModel: ClanFixturesBuilder.createClanModel(),
            clan: async (row) => Object.assign({id: 10}, row),
            clanMembers: async (row) => Object.assign({id: 5}, row)
        }, overrides);
    }

    async runCreate(setup)
    {
        await ClanCreate.execute(
            setup.client,
            {[TeamsConst.ACTIONS.CLAN_NAME]: 'E2eClan'},
            setup.room,
            setup.playerSchema,
            setup.teamsPlugin
        );
        return setup.sentMessages.map(message => message.result);
    }

    async testNoClanLevelAnswersTheLevelIssue()
    {
        await this.test('no stored clan level answers the level issue and stores no clan', async () => {
            let setup = this.createSetup(this.createStorageResults({firstLevel: false}));
            this.assert.deepStrictEqual(await this.runCreate(setup), [TeamsConst.VALIDATION.LEVEL_ISSUE]);
            this.assert.deepStrictEqual(setup.storageCalls, []);
        });
    }

    async testAClanStorageErrorAnswersTheCreateError()
    {
        await this.test('a clan row storage error answers the create error', async () => {
            let setup = this.createSetup(this.createStorageResults({
                clan: async () => Promise.reject({message: 'Duplicated owner.'})
            }));
            this.assert.deepStrictEqual(await this.runCreate(setup), [TeamsConst.VALIDATION.CREATE_ERROR]);
            this.assert.strictEqual(setup.playerSchema.privateData.clan, false);
        });
    }

    async testAnOwnerMembershipNotStoredDeletesTheClan()
    {
        await this.test('an owner membership not stored answers the owner error and deletes the created clan', async () => {
            let failures = [async () => false, async () => Promise.reject({message: 'Membership storage error.'})];
            for(let membershipFailure of failures){
                let setup = this.createSetup(this.createStorageResults({clanMembers: membershipFailure}));
                this.assert.deepStrictEqual(await this.runCreate(setup), [TeamsConst.VALIDATION.CREATE_OWNER_ERROR]);
                this.assert.deepStrictEqual(setup.storageCalls.pop(), {entityKey: 'clan', deletedId: 10});
                this.assert.strictEqual(setup.playerSchema.privateData.clan, false);
            }
        });
    }

    async testAClanNotLoadedAfterTheCreationAnswersTheCreateError()
    {
        await this.test('a clan not loaded after its creation answers the create error and deletes its rows', async () => {
            let setup = this.createSetup(this.createStorageResults({clanModel: false}));
            this.assert.deepStrictEqual(await this.runCreate(setup), [TeamsConst.VALIDATION.CREATE_ERROR]);
            this.assert.deepStrictEqual(setup.storageCalls.slice(2), [
                {entityKey: 'clanMembers', deleted: {player_id: 1, clan_id: 10}},
                {entityKey: 'clan', deletedId: 10}
            ]);
            this.assert.strictEqual(setup.playerSchema.privateData.clan, false);
            this.assert.deepStrictEqual(setup.teamsPlugin.clans, {});
        });
    }

    async testACreatedClanAnswersTheSuccess()
    {
        await this.test('a created and loaded clan answers the success and joins its owner', async () => {
            let setup = this.createSetup(this.createStorageResults({}));
            this.assert.deepStrictEqual(await this.runCreate(setup), [TeamsConst.VALIDATION.SUCCESS]);
            this.assert.strictEqual(setup.sentMessages[0].id, 10);
            this.assert.strictEqual(setup.playerSchema.privateData.clan, 10);
            this.assert.strictEqual(setup.teamsPlugin.clans[10].ownerClient, setup.client);
        });
    }

}

module.exports.TestClanCreate = TestClanCreate;
