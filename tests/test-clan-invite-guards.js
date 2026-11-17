/**
 *
 * Reldens - Test Clan Invite Guards
 *
 * Tests the clan invite guards with the room and the teams plugin stubbed: the own player id is refused as a string and
 * as a number, an invite to a player already in the clan members is refused, with the open invites off only the owner
 * invites and with them on a member invites too.
 *
 */

const { BaseTest } = require('./base-test');
const { TryClanInvite } = require('../lib/teams/server/message-actions/try-clan-invite');
const { TeamsConst } = require('../lib/teams/constants');

class TestClanInviteGuards extends BaseTest
{

    createSetup(openInvites)
    {
        let setup = {sent: [], invites: []};
        let clan = {
            id: 3,
            owner: {player_id: '1'},
            members: {1: {}, 2: {}},
            addInvite: (invitedId, senderId) => setup.invites.push([invitedId, senderId])
        };
        setup.teamsPlugin = {clanOpenInvites: openInvites, clans: {3: clan}, events: {emit: async () => true}};
        setup.room = {
            roomId: 'room-1',
            activePlayerByPlayerId: (playerId) => ({client: {send: (type, message) => setup.sent.push([playerId, message.act])}})
        };
        return setup;
    }

    createPlayer(playerId)
    {
        return {player_id: String(playerId), playerName: 'player'+playerId, sessionId: 'session'+playerId, getPrivate: () => 3};
    }

    async invite(setup, senderId, invitedId)
    {
        return await TryClanInvite.execute({}, {id: invitedId}, setup.room, this.createPlayer(senderId), setup.teamsPlugin);
    }

    async testSelfAndMemberInvitesAreRefused()
    {
        await this.test('the own id as a string or a number and a clan member are not invited', async () => {
            let setup = this.createSetup(true);
            let results = [await this.invite(setup, 1, '1'), await this.invite(setup, 1, 1), await this.invite(setup, 1, 2)];
            this.assert.deepStrictEqual([results, setup.sent, setup.invites], [[false, false, false], [], []]);
        });
    }

    async testOpenInvitesOffOnlyTheOwnerInvites()
    {
        await this.test('with the open invites off only the owner invites, with them on a member invites too', async () => {
            let closedSetup = this.createSetup(false);
            let closedResults = [await this.invite(closedSetup, 2, 4), await this.invite(closedSetup, 1, 4)];
            let openSetup = this.createSetup(true);
            let openResults = [await this.invite(openSetup, 2, 4)];
            this.assert.deepStrictEqual(
                [closedResults, closedSetup.invites, closedSetup.sent],
                [[false, true], [[4, '1']], [[4, TeamsConst.ACTIONS.CLAN_INVITE]]]
            );
            this.assert.deepStrictEqual([openResults, openSetup.invites], [[true], [[4, '2']]]);
        });
    }

}

module.exports.TestClanInviteGuards = TestClanInviteGuards;
