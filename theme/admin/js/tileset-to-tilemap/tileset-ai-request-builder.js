class TilesetAiRequestBuilder
{
    constructor(app)
    {
        this.app = app;
    }

    build(tileset, provider, extraData)
    {
        let body = {
            sessionId: tileset.sessionId,
            imageId: tileset.imageId,
            tileWidth: tileset.tileWidth,
            tileHeight: tileset.tileHeight,
            spacing: tileset.spacing,
            margin: tileset.margin,
            bgColor: tileset.bgColor,
            provider
        };
        if(!extraData){
            return body;
        }
        for(let key of Object.keys(extraData)){
            body[key] = extraData[key];
        }
        return body;
    }
}
