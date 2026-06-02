class MapResizerBorders
{
    static borderKeys = {
        top: 'border-top',
        bottom: 'border-bottom',
        left: 'border-left',
        right: 'border-right',
        topLeft: 'border-top-left',
        topRight: 'border-top-right',
        bottomLeft: 'border-bottom-left',
        bottomRight: 'border-bottom-right'
    };

    static restamp(editor, newWidth, newHeight)
    {
        let bordersLayer = MapResizerBorders.findBordersLayer(editor);
        if(!bordersLayer){
            return false;
        }
        let gids = MapResizerBorders.collectBorderGids(editor);
        if(!gids){
            return false;
        }
        bordersLayer.data = MapResizerBorders.buildBordersData(newWidth, newHeight, gids);
        return true;
    }

    static findBordersLayer(editor)
    {
        return MapResizerBorders.matchTilelayerByName(
            editor.mapJson.layers,
            editor.mapElements.bordersLayer ? editor.mapElements.bordersLayer : 'borders'
        );
    }

    static matchTilelayerByName(layers, name)
    {
        return layers.find((mapLayer) => 'tilelayer' === mapLayer.type && mapLayer.name === name);
    }

    static collectBorderGids(editor)
    {
        let tilesets = editor.mapJson.tilesets;
        if(!tilesets || 0 === tilesets.length){
            return null;
        }
        let lookup = {};
        let tiles = tilesets[0].tiles ? tilesets[0].tiles : [];
        for(let tileDef of tiles){
            MapResizerBorders.collectFromTile(lookup, tileDef);
        }
        if(0 === Object.keys(lookup).length){
            return null;
        }
        return lookup;
    }

    static collectFromTile(lookup, tileDef)
    {
        let properties = tileDef.properties ? tileDef.properties : [];
        for(let prop of properties){
            if('key' !== prop.name){
                continue;
            }
            let kind = MapResizerBorders.borderKindFor(prop.value);
            if(kind){
                lookup[kind] = tileDef.id + 1;
            }
        }
    }

    static borderKindFor(value)
    {
        for(let kind of Object.keys(MapResizerBorders.borderKeys)){
            if(MapResizerBorders.borderKeys[kind] === value){
                return kind;
            }
        }
        return null;
    }

    static buildBordersData(newWidth, newHeight, gids)
    {
        let data = new Array(newWidth * newHeight).fill(0);
        MapResizerBorders.stampEdges(data, newWidth, newHeight, gids);
        MapResizerBorders.stampCorners(data, newWidth, newHeight, gids);
        return data;
    }

    static stampEdges(data, newWidth, newHeight, gids)
    {
        let topGid = gids.top ? gids.top : 0;
        let bottomGid = gids.bottom ? gids.bottom : 0;
        for(let col = 1; col < newWidth - 1; col++){
            data[col] = topGid;
            data[(newHeight - 1) * newWidth + col] = bottomGid;
        }
        let leftGid = gids.left ? gids.left : 0;
        let rightGid = gids.right ? gids.right : 0;
        for(let row = 1; row < newHeight - 1; row++){
            data[row * newWidth] = leftGid;
            data[row * newWidth + (newWidth - 1)] = rightGid;
        }
    }

    static stampCorners(data, newWidth, newHeight, gids)
    {
        data[0] = gids.topLeft ? gids.topLeft : 0;
        data[newWidth - 1] = gids.topRight ? gids.topRight : 0;
        data[(newHeight - 1) * newWidth] = gids.bottomLeft ? gids.bottomLeft : 0;
        data[(newHeight - 1) * newWidth + (newWidth - 1)] = gids.bottomRight ? gids.bottomRight : 0;
    }
}
window.MapResizerBorders = MapResizerBorders;
