var DataLink = require('../modules/datalink');

class Scene
{

    constructor(id)
    {
        this.id = id;
        this.map = '';
        this.image = '';
        this.collisions = '';
        this.layers = '';
        this.return_positions = '';
    }

    load()
    {
        var self = this;
        var queryString = 'SELECT * FROM scenes WHERE name="'+this.id+'";';
        return new Promise((resolve, reject) => {
            DataLink.connection.query(queryString, self.id, (err, rows) => {
                if(err){
                    return reject(self.id);
                }
                if(rows){
                    // @TODO: refactor to get row data values as object.
                    var sceneData = '';
                    for(let i=0; i<rows.length; i++){
                        sceneData = rows[i];
                        break;
                    }
                    self.parseData(sceneData);
                }
            });
        });
    }

    parseData(sceneData)
    {
        this.map = sceneData.map;
        this.image = sceneData.image;
        this.collisions = JSON.parse(sceneData.collisions);
        this.layers = JSON.parse(sceneData.layers);
        this.return_positions = JSON.parse(sceneData.return_positions);
    }

}

exports.scene = Scene;

/*
use sample:
var Scene = require('../modules/scene').scene;
this.scene = new Scene('town');
this.scene.load().then(function(test){
    console.log(test);
}).catch(function(test2){
    console.log('cat ', test2);
});
 */