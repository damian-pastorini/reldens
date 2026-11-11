/**
 *
 * Reldens - Game Room Join
 *
 * Joins the game rooms from the tests process through the Colyseus client, as a client without a browser would do it,
 * from the IPv4 or the IPv6 local address, so the server sees two different request addresses. Returns whether the
 * join was accepted and the rejection message, an accepted join leaves the room right away. Also logs in, registers
 * new accounts and sends wrong password logins through those joins.
 *
 */

const { expect } = require('@playwright/test');
const { Client } = require('@colyseus/sdk');
const { SecurityApi } = require('./security-api');
const { DirectFormSubmit } = require('./direct-form-submit');
const { GameConst } = require('../../../lib/game/constants');

class GameRoomJoin
{

    static IPV4_HOST = '127.0.0.1';
    static IPV6_HOST = '[::1]';
    static WRONG_PASSWORD = 'e2e-wrong-password';
    static ACCEPTED = {joined: true, error: ''};
    static REJECTED = {joined: false, error: GameConst.INVALID_LOGIN_MESSAGE};

    static async join(gameConfig, options, host = GameRoomJoin.IPV4_HOST, roomName = GameConst.ROOM_GAME)
    {
        let joinResult = {joined: false, error: ''};
        let joinedRoom = await new Client(SecurityApi.hostUrl(gameConfig, host)).joinOrCreate(roomName, options).catch(
            (error) => {
                joinResult.error = error.message;
                return false;
            }
        );
        if(joinedRoom){
            joinResult.joined = true;
            await joinedRoom.leave();
        }
        return joinResult;
    }

    static createAccount(nameSuffix, email = '')
    {
        let username = DirectFormSubmit.createUniqueName()+nameSuffix;
        return {username, email: email || username+'@yourgame.com'};
    }

    static async register(gameConfig, account, host = GameRoomJoin.IPV4_HOST)
    {
        return await GameRoomJoin.join(gameConfig, Object.assign(
            DirectFormSubmit.createRegistration(account.username, account.email, DirectFormSubmit.VALID_PASSWORD),
            {isNewUser: true}
        ), host);
    }

    static async createRegisteredAccount(gameConfig, nameSuffix, host = GameRoomJoin.IPV4_HOST)
    {
        let account = GameRoomJoin.createAccount(nameSuffix);
        expect(await GameRoomJoin.register(gameConfig, account, host), account.username).toEqual(GameRoomJoin.ACCEPTED);
        return account;
    }

    static async login(gameConfig, username, password, host = GameRoomJoin.IPV4_HOST)
    {
        return await GameRoomJoin.join(gameConfig, {username, password}, host);
    }

    static async failLogins(gameConfig, usernames, host = GameRoomJoin.IPV4_HOST)
    {
        for(let username of usernames){
            expect(await GameRoomJoin.login(gameConfig, username, GameRoomJoin.WRONG_PASSWORD, host), username).toEqual(
                GameRoomJoin.REJECTED
            );
        }
    }

}

module.exports.GameRoomJoin = GameRoomJoin;
