class TilesetCanvasMarkers
{
    static POSITIONAL_CONFIG = [
        { key: 'surroundingTiles',       label: 'S',  color: '#ff9c5b' },
        { key: 'corners',                label: 'C',  color: '#5bbbff' },
        { key: 'bordersTiles',           label: 'T',  color: '#c05bff' },
        { key: 'borderCornersTiles',     label: 'K',  color: '#ff5bc0' },
        { key: 'innerWallsTiles',        label: 'IW', color: '#ff5b5b' },
        { key: 'innerWallsCornerTiles',  label: 'IC', color: '#ff9090' },
        { key: 'outerWallsTiles',        label: 'OW', color: '#5bffff' },
        { key: 'outerWallsCornerTiles',  label: 'OC', color: '#90ffff' },
    ];

    constructor(renderer)
    {
        this.renderer = renderer;
    }

    draw(ctx, tileset, tilesetIndex)
    {
        let markers = this.collect(tileset, tilesetIndex);
        if(markers.length){
            this.renderHighlights(ctx, tileset, markers);
            this.render(ctx, tileset, markers);
        }
    }

    renderHighlights(ctx, tileset, markers)
    {
        let drawn = new Set();
        ctx.save();
        ctx.lineWidth = 1.5;
        for(let marker of markers){
            let key = marker.tile[0]+','+marker.tile[1];
            if(drawn.has(key)){
                continue;
            }
            drawn.add(key);
            let pos = this.renderer.app.tileGeometry.getTilePosition(tileset, marker.tile);
            ctx.globalAlpha = 0.25;
            ctx.fillStyle = marker.color;
            ctx.fillRect(pos.x, pos.y, tileset.tileWidth, tileset.tileHeight);
            ctx.globalAlpha = 0.7;
            ctx.strokeStyle = marker.color;
            ctx.strokeRect(pos.x + 1, pos.y + 1, tileset.tileWidth - 2, tileset.tileHeight - 2);
        }
        ctx.restore();
    }

    collect(tileset, tilesetIndex)
    {
        let app = this.renderer.app;
        if(null !== app.selectedElement && !this.isMapTilesTabActive(tilesetIndex)){
            return [];
        }
        let markers = [];
        if(this.isMapTilesTabActive(tilesetIndex)){
            this.addOptions(markers, tileset, tileset.tileOptions ? tileset.tileOptions : {});
            for(let spot of (tileset.spots ? tileset.spots : [])){
                this.addOptions(markers, tileset, this.buildSpotOpts(spot));
                if(null !== spot.spotTile && undefined !== spot.spotTile){
                    this.pushFlat(markers, tileset, spot.spotTile, 'ST', '#ff8c5b');
                }
            }
        }
        if(this.isGlobalPanelOpen() && app.globalTileOptions){
            this.addGlobalOptions(markers, tileset, app.globalTileOptions, tilesetIndex);
        }
        return markers;
    }

    isTabActive(tilesetIndex, tabName)
    {
        let row = document.querySelector('[data-tileset-index="'+tilesetIndex+'"]');
        if(!row){
            return false;
        }
        return null !== row.querySelector('.legend-tab-pane[data-tab="'+tabName+'"]:not(.hidden)');
    }

    isMapObjectsTabActive(tilesetIndex)
    {
        return this.isTabActive(tilesetIndex, 'map-objects');
    }

    isMapTilesTabActive(tilesetIndex)
    {
        return this.isTabActive(tilesetIndex, 'map-tiles');
    }

    isGlobalPanelOpen()
    {
        return null !== document.querySelector('.global-tile-options:not(.hidden)');
    }

    addOptions(markers, tileset, opts)
    {
        if(null !== opts.groundTile && undefined !== opts.groundTile){
            this.pushFlat(markers, tileset, opts.groundTile, 'G', '#5bff8c');
        }
        if(null !== opts.pathTile && undefined !== opts.pathTile){
            this.pushFlat(markers, tileset, opts.pathTile, 'P', '#5b8cff');
        }
        if(null !== opts.borderTile && undefined !== opts.borderTile){
            this.pushFlat(markers, tileset, opts.borderTile, 'B', '#aaaacc');
        }
        if(opts.randomGroundTiles && opts.randomGroundTiles.length){
            for(let fi of opts.randomGroundTiles){
                this.pushFlat(markers, tileset, fi, 'R', '#a5ff8c');
            }
        }
        for(let { key, label, color } of TilesetCanvasMarkers.POSITIONAL_CONFIG){
            this.addPositional(markers, tileset, opts[key] ? opts[key] : {}, label, color);
        }
    }

    buildSpotOpts(spot)
    {
        let spotOpts = { randomGroundTiles: spot.spotTileVariations };
        for(let key of SharedUtils.SPOT_POSITIONAL_KEYS){
            spotOpts[key] = spot[key];
        }
        return spotOpts;
    }

    addPositional(markers, tileset, posObj, label, color)
    {
        let positions = Object.keys(posObj);
        for(let pos of positions){
            let fi = posObj[pos];
            if(null === fi || undefined === fi){
                continue;
            }
            this.pushFlat(markers, tileset, fi, label, color);
        }
    }

    addGlobalOptions(markers, tileset, opts, currentTilesetIndex)
    {
        this.addGlobalSimple(markers, tileset, opts.groundTile, currentTilesetIndex, 'G', '#5bff8c');
        this.addGlobalSimple(markers, tileset, opts.pathTile, currentTilesetIndex, 'P', '#5b8cff');
        this.addGlobalSimple(markers, tileset, opts.borderTile, currentTilesetIndex, 'B', '#aaaacc');
        if(opts.randomGroundTiles && opts.randomGroundTiles.length){
            for(let entry of opts.randomGroundTiles){
                this.addGlobalSimple(markers, tileset, entry, currentTilesetIndex, 'R', '#a5ff8c');
            }
        }
        for(let { key, label, color } of TilesetCanvasMarkers.POSITIONAL_CONFIG){
            this.addGlobalPositional(markers, tileset, opts[key] ? opts[key] : {}, currentTilesetIndex, label, color);
        }
    }

    addGlobalSimple(markers, tileset, entry, currentTilesetIndex, label, color)
    {
        if(!entry || entry.tilesetIndex !== currentTilesetIndex){
            return;
        }
        this.pushFlat(markers, tileset, entry.flatIndex, label, color);
    }

    addGlobalPositional(markers, tileset, posObj, currentTilesetIndex, label, color)
    {
        let positions = Object.keys(posObj);
        for(let pos of positions){
            let entry = posObj[pos];
            if(!entry || entry.tilesetIndex !== currentTilesetIndex){
                continue;
            }
            this.pushFlat(markers, tileset, entry.flatIndex, label, color);
        }
    }

    pushFlat(markers, tileset, flatIndex, label, color)
    {
        markers.push({ tile: [Math.floor(flatIndex / tileset.tilesetColumns), flatIndex % tileset.tilesetColumns], label, color });
    }

    render(ctx, tileset, markers)

    {
        let cellSize = Math.min(tileset.tileWidth, tileset.tileHeight);
        let size = Math.min(Math.round(cellSize * 0.35), 14);
        let fontSize = Math.max(size - 3, 6);
        ctx.save();
        ctx.font = 'bold '+fontSize+'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let tileOffsets = new Map();
        for(let marker of markers){
            let key = marker.tile[0]+','+marker.tile[1];
            let offset = tileOffsets.has(key) ? tileOffsets.get(key) : 0;
            tileOffsets.set(key, offset + 1);
            let pos = this.renderer.app.tileGeometry.getTilePosition(tileset, marker.tile);
            let x = pos.x + tileset.tileWidth - size - 1 - (offset * (size + 1));
            let y = pos.y + 1;
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = marker.color;
            ctx.fillRect(x, y, size, size);
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#000000';
            ctx.fillText(marker.label, x + size / 2, y + size / 2);
        }
        ctx.restore();
    }
}
window.TilesetCanvasMarkers = TilesetCanvasMarkers;
