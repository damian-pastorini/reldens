const mapJson = require('../../client/assets/maps/town');
const P2 = require('p2');
const share = require('../../shared/constants');

class P2world extends P2.World
{

    setMapCollisions(mapData)
    {
        var selfWorld = this;
        // Note: for collisions in server side we need to include the defined main layer.
        // @TODO:
        // - Fix maps to create proper body blocks.
        // - Refactor to use ray cast and avoid the amount the overload of bodies created.
        mapData.layers.collider[mapData.layers.collider.length] = mapData.layers.main;
        for(var ci in mapData.layers.collider){
            let colliderIndex = mapData.layers.collider[ci];
            if(mapJson.layers[colliderIndex]){
                var layerData = mapJson.layers[colliderIndex].data;
                for (var c = 0; c < mapJson.width; c++) {
                    var positionX = c*32;
                    for (var r = 0; r < mapJson.height; r++) {
                        // position in pixels
                        var positionY = r*32;
                        var tile = layerData[r * mapJson.width + c];
                        if (tile !== 0) { // 0 => empty tiles without collision
                            var boxShape = new P2.Box({ width: 32, height: 32});
                            boxShape.collisionGroup = share.COL_GROUND;
                            boxShape.collisionMask = share.COL_PLAYER | share.COL_ENEMY;
                            var boxBody = new P2.Body({
                                position: [positionX, positionY],
                                mass:1,
                                type: P2.Body.STATIC
                            });
                            boxBody.addShape(boxShape);
                            selfWorld.addBody(boxBody);
                        }
                    }
                }
            }
        }
    }

}

exports.p2world = P2world;
