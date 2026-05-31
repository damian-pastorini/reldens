class MapsElementsMapResizerBorders
{
    static BORDER_PROPERTY_KEYS = {
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
        let bordersLayer = MapsElementsMapResizerBorders.findBordersLayer(editor);
        if(!bordersLayer){
            return false;
        }
        let gids = MapsElementsMapResizerBorders.collectBorderGids(editor);
        if(!gids){
            return false;
        }
        bordersLayer.data = MapsElementsMapResizerBorders.buildBordersData(newWidth, newHeight, gids);
        return true;
    }

    static findBordersLayer(editor)
    {
        let name = editor.mapElements.bordersLayer || 'borders';
        for(let mapLayer of editor.mapJson.layers){
            if('tilelayer' === mapLayer.type && mapLayer.name === name){
                return mapLayer;
            }
        }
        return null;
    }

    static collectBorderGids(editor)
    {
        let tilesets = editor.mapJson.tilesets;
        if(!tilesets || 0 === tilesets.length){
            return null;
        }
        let lookup = {};
        for(let tileDef of tilesets[0].tiles || []){
            MapsElementsMapResizerBorders.collectFromTile(lookup, tileDef);
        }
        return 0 < Object.keys(lookup).length ? lookup : null;
    }

    static collectFromTile(lookup, tileDef)
    {
        for(let prop of tileDef.properties || []){
            if('key' !== prop.name){
                continue;
            }
            let kind = MapsElementsMapResizerBorders.borderKindFor(prop.value);
            if(kind){
                lookup[kind] = tileDef.id + 1;
            }
        }
    }

    static borderKindFor(value)
    {
        for(let kind of Object.keys(MapsElementsMapResizerBorders.BORDER_PROPERTY_KEYS)){
            if(MapsElementsMapResizerBorders.BORDER_PROPERTY_KEYS[kind] === value){
                return kind;
            }
        }
        return null;
    }

    static buildBordersData(newWidth, newHeight, gids)
    {
        let data = new Array(newWidth * newHeight).fill(0);
        MapsElementsMapResizerBorders.stampEdges(data, newWidth, newHeight, gids);
        MapsElementsMapResizerBorders.stampCorners(data, newWidth, newHeight, gids);
        return data;
    }

    static stampEdges(data, newWidth, newHeight, gids)
    {
        for(let col = 1; col < newWidth - 1; col++){
            data[col] = gids.top || 0;
            data[(newHeight - 1) * newWidth + col] = gids.bottom || 0;
        }
        for(let row = 1; row < newHeight - 1; row++){
            data[row * newWidth] = gids.left || 0;
            data[row * newWidth + (newWidth - 1)] = gids.right || 0;
        }
    }

    static stampCorners(data, newWidth, newHeight, gids)
    {
        data[0] = gids.topLeft || 0;
        data[newWidth - 1] = gids.topRight || 0;
        data[(newHeight - 1) * newWidth] = gids.bottomLeft || 0;
        data[(newHeight - 1) * newWidth + (newWidth - 1)] = gids.bottomRight || 0;
    }
}
window.MapsElementsMapResizerBorders = MapsElementsMapResizerBorders;
