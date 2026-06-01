class TilesetGroundSelector
{

    collectEligibleGroundTilesets(state)
    {
        let result = [];
        for(let i = 0; i < state.length; i++){
            let tileset = state[i];
            if(!this.tilesetHasGroundOptions(tileset)){
                continue;
            }
            result.push({value: tileset.filename, label: tileset.filename});
        }
        return result;
    }

    tilesetHasSelectedItems(tileset)
    {
        for(let element of (tileset.elements || [])){
            if(element.bulkSelected){
                return true;
            }
        }
        for(let spot of (tileset.spots || [])){
            if(spot.bulkSelected){
                return true;
            }
        }
        return false;
    }

    tilesetHasGroundOptions(tileset)
    {
        let tileOptions = tileset.tileOptions;
        if(!tileOptions){
            return false;
        }
        if(null !== tileOptions.groundTile && undefined !== tileOptions.groundTile){
            return true;
        }
        if(tileOptions.randomGroundTiles && tileOptions.randomGroundTiles.length){
            return true;
        }
        if(tileOptions.surroundingTiles && Object.keys(tileOptions.surroundingTiles).length){
            return true;
        }
        if(tileOptions.corners && Object.keys(tileOptions.corners).length){
            return true;
        }
        return false;
    }

    stripGroundOptions(tileOptions)
    {
        let cleaned = Object.assign({}, tileOptions);
        cleaned.groundTile = null;
        cleaned.pathTile = null;
        cleaned.borderTile = null;
        cleaned.randomGroundTiles = [];
        cleaned.surroundingTiles = {};
        cleaned.corners = {};
        cleaned.bordersTiles = {};
        return cleaned;
    }

    applyPreferredGround(tilesets, preferredKey)
    {
        for(let tileset of tilesets){
            if(tileset.filename === preferredKey){
                continue;
            }
            if(!tileset.tileOptions){
                continue;
            }
            tileset.tileOptions = this.stripGroundOptions(tileset.tileOptions);
        }
    }

}
window.TilesetGroundSelector = TilesetGroundSelector;
