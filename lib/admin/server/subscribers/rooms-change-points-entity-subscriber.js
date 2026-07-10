/**
 *
 * Reldens - RoomsChangePointsEntitySubscriber
 *
 * Injects the rooms map data into the change points edit form so the tile selector canvas can render
 * the selected room's map and set the tile index on tile click. See RoomsMapEditFormSubscriber.
 *
 */

const { RoomsMapEditFormSubscriber } = require('./rooms-map-editform-subscriber');

class RoomsChangePointsEntitySubscriber extends RoomsMapEditFormSubscriber
{

    /**
     * @param {import('@reldens/cms/lib/admin-manager').AdminManager} adminManager
     */
    constructor(adminManager)
    {
        super(adminManager, 'rooms_change_points');
    }

}

module.exports.RoomsChangePointsEntitySubscriber = RoomsChangePointsEntitySubscriber;
