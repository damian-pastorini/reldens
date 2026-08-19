class TilesetSpotCanvasDrawer
{
    constructor(renderer)
    {
        this.renderer = renderer;
    }

    drawSpotTiles(ctx, tileset, tilesetIndex)
    {
        let filters = this.renderer.readVisibilityFilters(tilesetIndex);
        if(!filters || !filters.showSpots){
            return;
        }
        let spots = tileset.spots;
        if(!spots.length){
            return;
        }
        let app = this.renderer.app;
        let hasSelection = app.selectedSpot && app.selectedSpot.tilesetIndex === tilesetIndex;
        let selectedSpot = null;
        for(let si = 0; si < spots.length; si++){
            if(hasSelection && app.selectedSpot.spotIndex === si){
                selectedSpot = spots[si];
                continue;
            }
            this.drawSingleSpot(ctx, tileset, spots[si], hasSelection);
        }
        if(selectedSpot){
            this.drawSingleSpot(ctx, tileset, selectedSpot, false);
        }
    }

    drawSingleSpot(ctx, tileset, spot, dimmed)
    {
        let cols = tileset.tilesetColumns;
        let flatIndices = this.collectSpotFlatIndices(spot);
        ctx.save();
        ctx.strokeStyle = '#ff8c5b';
        ctx.lineWidth = 2;
        for(let fi of flatIndices){
            let tile = [Math.floor(fi / cols), fi % cols];
            let tilePos = this.renderer.app.tileGeometry.getTilePosition(tileset, tile);
            ctx.globalAlpha = dimmed ? 0.1 : 0.4;
            ctx.fillStyle = '#ff8c5b';
            ctx.fillRect(tilePos.x, tilePos.y, tileset.tileWidth, tileset.tileHeight);
            ctx.globalAlpha = dimmed ? 0.25 : 1;
            ctx.strokeRect(tilePos.x + 1, tilePos.y + 1, tileset.tileWidth - 2, tileset.tileHeight - 2);
        }
        ctx.restore();
    }

    collectSpotFlatIndices(spot)
    {
        let indices = new Set();
        if(SharedUtils.isSet(spot.spotTile)){
            indices.add(spot.spotTile);
        }
        if(spot.spotTileVariations){
            for(let fi of spot.spotTileVariations){
                indices.add(fi);
            }
        }
        for(let key of SharedUtils.SPOT_POSITIONAL_KEYS){
            this.addPositionalIndices(indices, spot[key]);
        }
        return indices;
    }

    addPositionalIndices(indices, posObj)
    {
        if(!posObj){
            return;
        }
        for(let key of Object.keys(posObj)){
            let fi = posObj[key];
            if(SharedUtils.isSet(fi)){
                indices.add(fi);
            }
        }
    }
}
window.TilesetSpotCanvasDrawer = TilesetSpotCanvasDrawer;

