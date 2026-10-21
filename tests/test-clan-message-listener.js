/**
 *
 * Reldens - Test Clan Message Listener
 *
 */

const { BaseTest } = require('./base-test');
const { ClanMessageListener } = require('../lib/teams/client/clan-message-listener');
const { TeamsConst } = require('../lib/teams/constants');

class TestClanMessageListener extends BaseTest
{

    createClanMessageHandler(calledMethods)
    {
        return {
            removeClanUi: () => calledMethods.push('removeClanUi'),
            initializeClanUi: () => calledMethods.push('initializeClanUi')
        };
    }

    async testTheRemovedClanMessageRebuildsTheClanUi()
    {
        await this.test('the clan removed message removes and initializes the clan UI', async () => {
            let calledMethods = [];
            new ClanMessageListener().handleClanMessage(
                {act: TeamsConst.ACTIONS.CLAN_REMOVED},
                this.createClanMessageHandler(calledMethods)
            );
            this.assert.deepStrictEqual(calledMethods, ['removeClanUi', 'initializeClanUi']);
        });
    }

    async testAnUnhandledClanMessageKeepsTheClanUi()
    {
        await this.test('an unhandled clan message keeps the clan UI', async () => {
            let calledMethods = [];
            let result = new ClanMessageListener().handleClanMessage(
                {act: TeamsConst.ACTIONS.CLAN_NAME},
                this.createClanMessageHandler(calledMethods)
            );
            this.assert.strictEqual(result, true);
            this.assert.deepStrictEqual(calledMethods, []);
        });
    }

}

module.exports.TestClanMessageListener = TestClanMessageListener;
