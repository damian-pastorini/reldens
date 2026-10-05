/**
 *
 * Reldens - Test Admin Session Store
 *
 */

const { BaseTest } = require('./base-test');
const { AdminSessionStore } = require('../lib/admin/server/admin-session-store');
const { sc } = require('@reldens/utils');
const util = require('util');

class TestAdminSessionStore extends BaseTest
{

    createSessionStore()
    {
        let storeSetup = {rows: {}};
        storeSetup.sessionStore = new AdminSessionStore({
            ttlMs: 60000,
            pruneIntervalMs: 3600000,
            sessionsRepository: {
                loadOneBy: async (field, sessionId) => sc.get(storeSetup.rows, sessionId, false),
                create: async (row) => storeSetup.rows[row.sid] = row,
                update: async (filters, patch) => Object.assign(storeSetup.rows[filters.sid], patch),
                delete: async (filters) => delete storeSetup.rows[filters.sid]
            }
        });
        clearInterval(storeSetup.sessionStore.pruneTimer);
        storeSetup.setSession = util.promisify(storeSetup.sessionStore.set.bind(storeSetup.sessionStore));
        storeSetup.getSession = util.promisify(storeSetup.sessionStore.get.bind(storeSetup.sessionStore));
        storeSetup.destroySession = util.promisify(storeSetup.sessionStore.destroy.bind(storeSetup.sessionStore));
        return storeSetup;
    }

    async testTheStoredSessionIsLoadedUntilItExpires()
    {
        await this.test('a stored session is loaded before its expiration and removed after it', async () => {
            let storeSetup = this.createSessionStore();
            let sessionData = {cookie: {}, user: {id: 5}};
            await storeSetup.setSession('session-a', sessionData);
            let loadedSession = await storeSetup.sessionStore.loadSession('session-a', Date.now());
            this.assert.deepStrictEqual(loadedSession, sessionData);
            let expires = storeSetup.rows['session-a'].expires;
            this.assert.strictEqual(await storeSetup.sessionStore.loadSession('session-a', expires), null);
            this.assert.strictEqual(sc.hasOwn(storeSetup.rows, 'session-a'), false);
        });
    }

    async testTheDestroyedSessionIsRemoved()
    {
        await this.test('a destroyed session is removed from the storage', async () => {
            let storeSetup = this.createSessionStore();
            await storeSetup.setSession('session-a', {cookie: {}, user: {id: 5}});
            await storeSetup.destroySession('session-a');
            this.assert.strictEqual(await storeSetup.getSession('session-a'), null);
        });
    }

    async testTheCookieExpirationIsUsedAsTheSessionExpiration()
    {
        await this.test('the session cookie expiration is stored as the session expiration', async () => {
            let storeSetup = this.createSessionStore();
            let cookieExpires = new Date(Date.now()+120000);
            await storeSetup.setSession('session-a', {cookie: {expires: cookieExpires}});
            this.assert.strictEqual(storeSetup.rows['session-a'].expires, cookieExpires.getTime());
        });
    }

}

module.exports.TestAdminSessionStore = TestAdminSessionStore;
