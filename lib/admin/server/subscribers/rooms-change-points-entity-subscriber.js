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
     * @param {import('../../../config/server/manager').ConfigManager|boolean} [config]
     */
    constructor(adminManager, config = false)
    {
        super(adminManager, 'rooms_change_points', config);
    }

}

module.exports.RoomsChangePointsEntitySubscriber = RoomsChangePointsEntitySubscriber;
