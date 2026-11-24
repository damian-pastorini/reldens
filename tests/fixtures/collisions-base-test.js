/**
 *
 * Reldens - CollisionsBaseTest
 *
 * Base of the collisions manager tests: a collisions manager over a room stub that records the emitted events and runs
 * the listeners a test sets, and the bullet, room object and player bodies the contacts run on (the object hits and the
 * removed bullets are recorded on the setup; a room object body has a responding object shape, like the world creates
 * it, so it is never a pass-through body unless a test turns its collision response off).
 *
 */

const { RandomMovementBaseTest } = require('./random-movement-base-test');
const { CollisionsManager } = require('../../lib/world/server/collisions-manager');
const { WorldConst } = require('../../lib/world/constants');
const { sc } = require('@reldens/utils');

class CollisionsBaseTest extends RandomMovementBaseTest
{

    createCollisionsSetup(roomWorldProps)
    {
        let setup = {emittedEvents: [], removedBullets: [], hits: [], listeners: {}};
        setup.collisionsManager = new CollisionsManager(null);
        setup.collisionsManager.room = {
            events: {emit: (eventName, eventData) => {
                setup.emittedEvents.push(eventName);
                return sc.get(setup.listeners, eventName, () => true)(eventData);
            }},
            roomWorld: Object.assign({removeBulletsStateIds: []}, roomWorldProps),
            state: {removeBody: () => true}
        };
        return setup;
    }

    createBullet(setup, key, hitPriority)
    {
        return {
            key,
            isBullet: true,
            isRoomObject: true,
            hitPriority,
            roomObject: {
                onHit: () => setup.hits.push(key),
                removeBullet: (bulletBody) => setup.removedBullets.push(bulletBody.key)
            }
        };
    }

    createRoomObjectBody(setup, key)
    {
        let body = this.bodyBuilder.buildWithShape(WorldConst.COLLISIONS.OBJECT);
        body.isRoomObject = true;
        body.roomObject = {onHit: () => setup.hits.push(key)};
        return body;
    }

    createPlayerBody(playerId)
    {
        let playerBody = this.bodyBuilder.build();
        playerBody.playerId = playerId;
        return playerBody;
    }

}

module.exports.CollisionsBaseTest = CollisionsBaseTest;
