/**
 *
 * Reldens - Servers Signed Requests State
 *
 * Server side e2e endpoints for the signed requests between the servers of a multi-server setup: the signed tokens
 * secret of the server, of the logged users keys of its rooms usage and of every signed server to server messenger
 * (chat relay, deleted rooms close, teams and clans sync; the given one, or the server one again with none), the
 * shared rooms servers addresses and the other servers of the user disconnection and of those messengers listed again
 * from the reloaded rooms servers, the other servers the rooms availability asks for their status (listed again from the
 * current rooms servers like the server start does, with the cached statuses dropped) and the cached statuses (their
 * cache time, the cached ones expired, a status requested so it is cached). The reset restores all of them before every
 * test and clears the loopback addresses counters of every route limiter, since the other servers of a test run call
 * the limited routes (disconnect user, server status) from the loopback address.
 *
 */

const { ipKeyGenerator } = require('express-rate-limit');
const { ServerUrlMatcher } = require('../../../lib/game/server-url-matcher');
const { sc } = require('@reldens/utils');

class ServersSignedRequestsState
{

    static LOOPBACK_ADDRESSES = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
    static SIGNED_MESSENGERS_PATHS = [
        ['chat', 'package', 'privateMessageRelay'],
        ['rooms', 'package', 'deletedRoomsCrossServerClose'],
        ['teams', 'package', 'teamCrossServerStateSync'],
        ['teams', 'package', 'clanCrossServerStateSync']
    ];
    static signedTokensSecret = '';
    static remoteServersUrls = [];
    static statusCacheMs = 0;

    static setRemoteServersUrls(serverManager, remoteServersUrls)
    {
        let roomsAvailability = serverManager.roomsAvailability;
        roomsAvailability.remoteServersUrls = remoteServersUrls;
        roomsAvailability.remoteServersStatus.statusesByServer = {};
        roomsAvailability.remoteServersStatus.cacheMs = ServersSignedRequestsState.statusCacheMs;
    }

    static expireStatuses(remoteServersStatus)
    {
        for(let serverUrl of Object.keys(remoteServersStatus.statusesByServer)){
            remoteServersStatus.statusesByServer[serverUrl].requestedAt = Date.now() - remoteServersStatus.cacheMs - 1;
        }
    }

    static async resetLoopbackLimits(serverManager)
    {
        for(let routerLayer of sc.get(serverManager.app.router, 'stack', [])){
            if(!sc.isFunction(routerLayer?.handle?.resetKey)){
                continue;
            }
            await ServersSignedRequestsState.resetLimiterLoopbackKeys(routerLayer.handle);
        }
    }

    static async resetLimiterLoopbackKeys(limiter)
    {
        for(let loopbackAddress of ServersSignedRequestsState.LOOPBACK_ADDRESSES){
            await limiter.resetKey(ipKeyGenerator(loopbackAddress));
        }
    }

    static fetchSignedMessengers(serverManager)
    {
        let featuresList = serverManager.featuresManager.featuresList;
        let messengers = [];
        for(let messengerPath of ServersSignedRequestsState.SIGNED_MESSENGERS_PATHS){
            let messenger = sc.getByPath(featuresList, [...messengerPath], false);
            if(messenger){
                messengers.push(messenger);
            }
        }
        return messengers;
    }

    static setSignedTokensSecret(serverManager, secret)
    {
        serverManager.loginManager.expiringHmacToken.secret = secret;
        serverManager.roomsAvailability.roomsUsageCollector.usersKeysSecret = secret;
        for(let messenger of ServersSignedRequestsState.fetchSignedMessengers(serverManager)){
            messenger.expiringHmacToken.secret = secret;
        }
    }

    static reloadOtherServersUrls(serverManager, roomsServers)
    {
        let serversAddresses = ServerUrlMatcher.fetchServersAddresses(
            roomsServers,
            serverManager.serverToServerMessengerProps.serverSelfAddresses
        );
        Object.assign(serverManager.serverToServerMessengerProps.roomsServers, serversAddresses.addressesByKey);
        serverManager.loginManager.userDisconnection.otherServersUrls = [...serversAddresses.addresses];
        for(let messenger of ServersSignedRequestsState.fetchSignedMessengers(serverManager)){
            messenger.otherServersUrls = [...serversAddresses.addresses];
        }
        return serversAddresses.addresses;
    }

    static async resetAll(serverManager)
    {
        await ServersSignedRequestsState.resetLoopbackLimits(serverManager);
        ServersSignedRequestsState.setSignedTokensSecret(serverManager, ServersSignedRequestsState.signedTokensSecret);
        ServersSignedRequestsState.setRemoteServersUrls(serverManager, [...ServersSignedRequestsState.remoteServersUrls]);
    }

    static registerEndpoints(serverManager)
    {
        ServersSignedRequestsState.signedTokensSecret = serverManager.loginManager.expiringHmacToken.secret;
        ServersSignedRequestsState.remoteServersUrls = [...serverManager.roomsAvailability.remoteServersUrls];
        ServersSignedRequestsState.statusCacheMs = serverManager.roomsAvailability.remoteServersStatus.cacheMs;
        let app = serverManager.app;
        app.post('/api/e2e/login-server/signed-tokens-secret', (request, response) => {
            ServersSignedRequestsState.setSignedTokensSecret(
                serverManager,
                String(sc.get(request.body, 'secret', ServersSignedRequestsState.signedTokensSecret))
            );
            response.json({ok: true});
        });
        app.post('/api/e2e/login-server/remote-status', async (request, response) => {
            let remoteServersStatus = serverManager.roomsAvailability.remoteServersStatus;
            remoteServersStatus.cacheMs = Number(sc.get(request.body, 'cacheMs', remoteServersStatus.cacheMs));
            if(true === sc.get(request.body, 'expire', false)){
                ServersSignedRequestsState.expireStatuses(remoteServersStatus);
            }
            let serverUrl = String(sc.get(request.body, 'serverUrl', ''));
            response.json({status: '' === serverUrl ? false : await remoteServersStatus.fetchStatus(serverUrl)});
        });
        app.post('/api/e2e/login-server/remote-servers', (request, response) => {
            let roomsAvailability = serverManager.roomsAvailability;
            ServersSignedRequestsState.setRemoteServersUrls(serverManager, ServerUrlMatcher.fetchServersAddresses(
                roomsAvailability.roomsServers,
                serverManager.serverToServerMessengerProps.serverSelfAddresses
            ).addresses);
            response.json({remoteServersUrls: roomsAvailability.remoteServersUrls});
        });
    }

}

module.exports.ServersSignedRequestsState = ServersSignedRequestsState;
