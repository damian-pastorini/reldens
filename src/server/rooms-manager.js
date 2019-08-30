const DataLink = require('../driver/datalink');

class RoomsManager
{

    constructor()
    {
        // default
    }

    async loadScenes()
    {
        // get scenes:
        let scenesQuery = 'SELECT * FROM scenes';
        let scenes = await DataLink.query(scenesQuery);
        for (let scene of scenes){
            // load change points:
            scene.change_points = [];
            let changePointsQuery = 'SELECT cp.tile_index AS tileIndex, s.name AS nextSceneName'+
                ' FROM scenes_change_points AS cp'+
                ' LEFT JOIN scenes AS s'+
                ' ON s.id = cp.next_scene_id'+
                ' WHERE cp.scene_id = ?';
            let changePoints = await DataLink.query(changePointsQuery, scene.id);
            // assign to scene:
            for (let changePoint of changePoints){
                scene.change_points.push({i: changePoint.tileIndex, n:changePoint.nextSceneName});
            }
        }
        return scenes;
    }

}

module.exports = RoomsManager;