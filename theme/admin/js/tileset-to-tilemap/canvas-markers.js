class TilesetCanvasMarkers
{
    constructor(renderer)
    {
        this.renderer = renderer;
        this.animationColor = '#ffd75b';
        this.animationActiveColor = '#ff8cff';
        this.positionalConfig = [
            { key: 'surroundingTiles',       label: 'S',  color: '#ff9c5b' },
            { key: 'corners',                label: 'C',  color: '#5bbbff' },
            { key: 'bordersTiles',           label: 'T',  color: '#c05bff' },
            { key: 'borderCornersTiles',     label: 'K',  color: '#ff5bc0' },
            { key: 'borderInnerCornersTiles', label: 'KI', color: '#ff8cd8' },
            { key: 'mapBorderWallsTiles',    label: 'MW', color: '#ffcc5b' },
            { key: 'innerWallsTiles',        label: 'IW', color: '#ff5b5b' },
            { key: 'innerWallsCornerTiles',  label: 'IC', color: '#ff9090' },
            { key: 'outerWallsTiles',        label: 'OW', color: '#5bffff' },
            { key: 'outerWallsCornerTiles',  label: 'OC', color: '#90ffff' }
        ];
        this.positionLabels = {
            '-1,-1': 'NW', '-1,0': 'N', '-1,1': 'NE',
            '0,-1': 'W', '0,0': 'C', '0,1': 'E',
            '1,-1': 'SW', '1,0': 'S', '1,1': 'SE',
            'top-left': 'TL', 'top-right': 'TR',
            'bottom-left': 'BL', 'bottom-right': 'BR',
            'top': 'T', 'right': 'R', 'bottom': 'B', 'left': 'L'
        };
    }

    isOptionGroupOpen(optionKey)
    {
        let grids = document.querySelectorAll('.tile-position-grid[data-option="'+optionKey+'"]');
        for(let grid of grids){
            let group = grid.closest('.tile-options-group');
            if(group && !group.classList.contains('collapsed')){
                return true;
            }
        }
        return false;
    }

    resolvePositionLabel(groupLabel, posKey)
    {
        let positionLabel = this.positionLabels[posKey];
        if(!positionLabel){
            return groupLabel;
        }
        return positionLabel;
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
        if(this.isAnimationsPanelOpen(tilesetIndex)){
            this.addAnimations(markers, tileset, tilesetIndex);
        }
        return markers;
    }

    isAnimationsPanelOpen(tilesetIndex)
    {
        let refs = this.renderer.app.refs[tilesetIndex];
        if(!refs || !refs.row){
            return false;
        }
        return null !== refs.row.querySelector('.tileset-animations-panel:not(.hidden)');
    }

    addAnimations(markers, tileset, tilesetIndex)
    {
        let animations = tileset.tileAnimations ? tileset.tileAnimations : [];
        for(let i = 0; i < animations.length; i++){
            this.addAnimationTiles(
                markers,
                tileset,
                animations[i],
                this.renderer.app.animationsBinder.isPickActive(tilesetIndex, i)
            );
        }
    }

    addAnimationTiles(markers, tileset, animation, isActive)
    {
        let color = isActive ? this.animationActiveColor : this.animationColor;
        if(SharedUtils.isSet(animation.baseTile)){
            this.pushFlat(markers, tileset, animation.baseTile, 'A', color);
        }
        for(let frame of (animation.frames ? animation.frames : [])){
            if(!SharedUtils.isSet(frame.tile) || frame.tile === animation.baseTile){
                continue;
            }
            this.pushFlat(markers, tileset, frame.tile, 'AF', color);
        }
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
        if(SharedUtils.isSet(tileOptions.groundTile)){
            this.pushFlat(markers, tileset, tileOptions.groundTile, 'G', '#5bff8c');
        }
        this.addFlatList(markers, tileset, tileOptions.groundTiles, 'G', '#5bff8c');
        if(SharedUtils.isSet(tileOptions.pathTile)){
            this.pushFlat(markers, tileset, tileOptions.pathTile, 'P', '#5b8cff');
        }
        if(SharedUtils.isSet(tileOptions.borderTile)){
            this.pushFlat(markers, tileset, tileOptions.borderTile, 'B', '#aaaacc');
        }
        this.addFlatList(markers, tileset, tileOptions.randomGroundTiles, 'R', '#a5ff8c');
        for(let positionalEntry of this.positionalConfig){
            if(!this.isOptionGroupOpen(positionalEntry.key)){
                continue;
            }
            this.addPositional(
                markers,
                tileset,
                tileOptions[positionalEntry.key] ? tileOptions[positionalEntry.key] : {},
                positionalEntry.label,
                positionalEntry.color
            );
        }
    }

    addFlatList(markers, tileset, flatList, label, color)
    {
        if(!flatList || !flatList.length){
            return;
        }
        for(let flatIndex of flatList){
            this.pushFlat(markers, tileset, flatIndex, label, color);
        }
    }

    addGlobalList(markers, tileset, entriesList, currentTilesetIndex, label, color)
    {
        if(!entriesList || !entriesList.length){
            return;
        }
        for(let entry of entriesList){
            this.addGlobalSimple(markers, tileset, entry, currentTilesetIndex, label, color);
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
            if(!SharedUtils.isSet(fi)){
                continue;
            }
            this.pushFlat(markers, tileset, fi, this.resolvePositionLabel(label, posKey), color);
        }
    }

    addGlobalOptions(markers, tileset, globalOptions, currentTilesetIndex)
    {
        this.addGlobalSimple(markers, tileset, globalOptions.groundTile, currentTilesetIndex, 'G', '#5bff8c');
        this.addGlobalList(markers, tileset, globalOptions.groundTiles, currentTilesetIndex, 'G', '#5bff8c');
        this.addGlobalSimple(markers, tileset, globalOptions.pathTile, currentTilesetIndex, 'P', '#5b8cff');
        this.addGlobalSimple(markers, tileset, globalOptions.borderTile, currentTilesetIndex, 'B', '#aaaacc');
        this.addGlobalList(markers, tileset, globalOptions.randomGroundTiles, currentTilesetIndex, 'R', '#a5ff8c');
        for(let positionalEntry of this.positionalConfig){
            if(!this.isOptionGroupOpen(positionalEntry.key)){
                continue;
            }
            this.addGlobalPositional(
                markers,
                tileset,
                globalOptions[positionalEntry.key] ? globalOptions[positionalEntry.key] : {},
                currentTilesetIndex,
                positionalEntry.label,
                positionalEntry.color
            );
        }
    }

    entryMatchesTileset(entry, tileset, currentTilesetIndex)
    {
        if(!entry){
            return false;
        }
        if('undefined' !== typeof entry.tilesetKey){
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
