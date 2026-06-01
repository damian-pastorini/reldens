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

    draw(canvasCtx, tileset, tilesetIndex)
    {
        let markers = this.collect(tileset, tilesetIndex);
        if(markers.length){
            this.renderHighlights(canvasCtx, tileset, markers);
            this.render(canvasCtx, tileset, markers);
        }
    }

    renderHighlights(canvasCtx, tileset, markers)
    {
        let drawn = new Set();
        canvasCtx.save();
        canvasCtx.lineWidth = 1.5;
        for(let marker of markers){
            let key = SharedUtils.tileKey(marker.tile);
            if(drawn.has(key)){
                continue;
            }
            drawn.add(key);
            let tilePos = this.renderer.app.tileGeometry.getTilePosition(tileset, marker.tile);
            canvasCtx.globalAlpha = 0.25;
            canvasCtx.fillStyle = marker.color;
            canvasCtx.fillRect(tilePos.x, tilePos.y, tileset.tileWidth, tileset.tileHeight);
            canvasCtx.globalAlpha = 0.7;
            canvasCtx.strokeStyle = marker.color;
            canvasCtx.strokeRect(tilePos.x + 1, tilePos.y + 1, tileset.tileWidth - 2, tileset.tileHeight - 2);
        }
        canvasCtx.restore();
    }

    collect(tileset, tilesetIndex)
    {
        let app = this.renderer.app;
        let markers = [];
        let isMapTilesTab = this.isMapTilesTabActive(tilesetIndex);
        let suppressPerTileset = null !== app.selectedElement && !isMapTilesTab;
        if(isMapTilesTab && !suppressPerTileset){
            this.addOptions(markers, tileset, tileset.tileOptions ? tileset.tileOptions : {});
            for(let spot of (tileset.spots ? tileset.spots : [])){
                this.addOptions(markers, tileset, this.buildSpotOpts(spot));
                if(SharedUtils.isSet(spot.spotTile)){
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
        let refs = this.renderer.app.refs[tilesetIndex];
        if(refs && refs.activeTab){
            return tabName === refs.activeTab;
        }
        if(!refs || !refs.row){
            return false;
        }
        return null !== refs.row.querySelector('.legend-tab-pane[data-tab="'+tabName+'"]:not(.hidden)');
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

    addOptions(markers, tileset, tileOptions)
    {
        if(null !== tileOptions.groundTile && undefined !== tileOptions.groundTile){
            this.pushFlat(markers, tileset, tileOptions.groundTile, 'G', '#5bff8c');
        }
        if(null !== tileOptions.pathTile && undefined !== tileOptions.pathTile){
            this.pushFlat(markers, tileset, tileOptions.pathTile, 'P', '#5b8cff');
        }
        if(null !== tileOptions.borderTile && undefined !== tileOptions.borderTile){
            this.pushFlat(markers, tileset, tileOptions.borderTile, 'B', '#aaaacc');
        }
        if(tileOptions.randomGroundTiles && tileOptions.randomGroundTiles.length){
            for(let fi of tileOptions.randomGroundTiles){
                this.pushFlat(markers, tileset, fi, 'R', '#a5ff8c');
            }
        }
        for(let { key, label, color } of TilesetCanvasMarkers.POSITIONAL_CONFIG){
            this.addPositional(markers, tileset, tileOptions[key] ? tileOptions[key] : {}, label, color);
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
        for(let posKey of positions){
            let fi = posObj[posKey];
            if(null === fi || undefined === fi){
                continue;
            }
            this.pushFlat(markers, tileset, fi, label, color);
        }
    }

    addGlobalOptions(markers, tileset, globalOptions, currentTilesetIndex)
    {
        this.addGlobalSimple(markers, tileset, globalOptions.groundTile, currentTilesetIndex, 'G', '#5bff8c');
        this.addGlobalSimple(markers, tileset, globalOptions.pathTile, currentTilesetIndex, 'P', '#5b8cff');
        this.addGlobalSimple(markers, tileset, globalOptions.borderTile, currentTilesetIndex, 'B', '#aaaacc');
        if(globalOptions.randomGroundTiles && globalOptions.randomGroundTiles.length){
            for(let entry of globalOptions.randomGroundTiles){
                this.addGlobalSimple(markers, tileset, entry, currentTilesetIndex, 'R', '#a5ff8c');
            }
        }
        for(let { key, label, color } of TilesetCanvasMarkers.POSITIONAL_CONFIG){
            this.addGlobalPositional(markers, tileset, globalOptions[key] ? globalOptions[key] : {}, currentTilesetIndex, label, color);
        }
    }

    entryMatchesTileset(entry, tileset, currentTilesetIndex)
    {
        if(!entry){
            return false;
        }
        if(undefined !== entry.tilesetKey){
            return entry.tilesetKey === tileset.filename;
        }
        return entry.tilesetIndex === currentTilesetIndex;
    }

    addGlobalSimple(markers, tileset, entry, currentTilesetIndex, label, color)
    {
        if(!this.entryMatchesTileset(entry, tileset, currentTilesetIndex)){
            return;
        }
        this.pushFlat(markers, tileset, entry.flatIndex, label, color);
    }

    addGlobalPositional(markers, tileset, posObj, currentTilesetIndex, label, color)
    {
        let positions = Object.keys(posObj);
        for(let posKey of positions){
            let entry = posObj[posKey];
            if(!this.entryMatchesTileset(entry, tileset, currentTilesetIndex)){
                continue;
            }
            this.pushFlat(markers, tileset, entry.flatIndex, label, color);
        }
    }

    pushFlat(markers, tileset, flatIndex, label, color)
    {
        markers.push({ tile: [Math.floor(flatIndex / tileset.tilesetColumns), flatIndex % tileset.tilesetColumns], label, color });
    }

    render(canvasCtx, tileset, markers)
    {
        let cellSize = Math.min(tileset.tileWidth, tileset.tileHeight);
        let size = Math.min(Math.round(cellSize * 0.35), 14);
        let fontSize = Math.max(size - 3, 6);
        canvasCtx.save();
        canvasCtx.font = 'bold '+fontSize+'px sans-serif';
        canvasCtx.textAlign = 'center';
        canvasCtx.textBaseline = 'middle';
        let tileOffsets = new Map();
        for(let marker of markers){
            let key = SharedUtils.tileKey(marker.tile);
            let offset = tileOffsets.has(key) ? tileOffsets.get(key) : 0;
            tileOffsets.set(key, offset + 1);
            let tilePos = this.renderer.app.tileGeometry.getTilePosition(tileset, marker.tile);
            let x = tilePos.x + tileset.tileWidth - size - 1 - (offset * (size + 1));
            let y = tilePos.y + 1;
            canvasCtx.globalAlpha = 0.9;
            canvasCtx.fillStyle = marker.color;
            canvasCtx.fillRect(x, y, size, size);
            canvasCtx.globalAlpha = 1;
            canvasCtx.fillStyle = '#000000';
            canvasCtx.fillText(marker.label, x + size / 2, y + size / 2);
        }
        canvasCtx.restore();
    }
}
window.TilesetCanvasMarkers = TilesetCanvasMarkers;
