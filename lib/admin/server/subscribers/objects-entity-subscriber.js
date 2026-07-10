/**
 *
 * Reldens - ObjectsEntitySubscriber
 *
 * Injects the rooms map data into the objects edit form so the tile selector canvas can render the
 * selected room's map and set the tile index on tile click. See RoomsMapEditFormSubscriber.
 *
 */

const { RoomsMapEditFormSubscriber } = require('./rooms-map-editform-subscriber');

class ObjectsEntitySubscriber extends RoomsMapEditFormSubscriber
{

    /**
     * @param {import('@reldens/cms/lib/admin-manager').AdminManager} adminManager
     */
    constructor(adminManager)
    {
        super(adminManager, 'objects');
    }

}

module.exports.ObjectsEntitySubscriber = ObjectsEntitySubscriber;
