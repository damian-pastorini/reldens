/* exported TilesetLegendRenderer */
class TilesetLegendRenderer
{
    constructor(editor)
    {
        this.editor = editor;
    }

    renderLegend(tilesetIndex)
    {
        let app = this.editor.app;
        let list = app.refs[tilesetIndex].list;
        list.textContent = '';
        let template = app.getElement('.element-row-template');
        let tileset = app.state[tilesetIndex];
        let elements = tileset.elements;
        for(let i = 0; i < elements.length; i++){
            let element = elements[i];
            let frag = template.content.cloneNode(true);
            this.buildElementRow(frag, element, tilesetIndex, i);
            list.appendChild(frag);
        }
        let spots = tileset.spots || [];
        let spotTemplate = app.getElement('.spot-row-template');
        if(spots.length && spotTemplate){
            for(let si = 0; si < spots.length; si++){
                this.editor.spotEditor.appendSpotRow(
                    list, spots[si], si, tileset, tilesetIndex, spotTemplate
                );
            }
        }
        if(app.tileOptionsBinder){
            app.tileOptionsBinder.events.bindSpotRows(tilesetIndex);
        }
        this.applyLegendVisibility(tilesetIndex);
        this.applyLegendSort(tilesetIndex);
    }

    readShowSpots(tilesetIndex)
    {
        let refs = this.editor.app.refs[tilesetIndex];
        if(!refs || !refs.showSpotsCheck){
            return true;
        }
        return refs.showSpotsCheck.checked;
    }

    applyLegendVisibility(tilesetIndex)
    {
        let app = this.editor.app;
        let refs = app.refs[tilesetIndex];
        if(!refs || !refs.list){
            return;
        }
        let filter = this.editor.elementVisibilityFilter(refs);
        let elements = app.state[tilesetIndex].elements;
        for(let elementRow of refs.list.querySelectorAll('.element-row')){
            let element = elements[Number(elementRow.dataset.elementIndex)];
            if(!element){
                continue;
            }
            elementRow.classList.toggle('hidden', !this.editor.matchesVisibilityFilter(element, filter));
        }
        for(let spotRow of refs.list.querySelectorAll('.spot-row')){
            spotRow.classList.toggle('hidden', !filter.showSpots);
        }
    }

    applyLegendSort(tilesetIndex)
    {
        let app = this.editor.app;
        let refs = app.refs[tilesetIndex];
        if(!refs || !refs.list){
            return;
        }
        let tileset = app.state[tilesetIndex];
        let legendSort = tileset.legendSort || {by: 'name', ascending: true};
        let direction = false === legendSort.ascending ? -1 : 1;
        let rows = [...refs.list.querySelectorAll('.element-row, .spot-row')];
        rows.sort((rowA, rowB) => direction * this.compareLegendRows(tileset, rowA, rowB, legendSort.by));
        for(let row of rows){
            refs.list.appendChild(row);
        }
    }

    compareLegendRows(tileset, rowA, rowB, sortBy)
    {
        let itemA = this.legendRowItem(tileset, rowA);
        let itemB = this.legendRowItem(tileset, rowB);
        if(!itemA || !itemB){
            return 0;
        }
        if('selected' === sortBy){
            let selectedA = itemA.generateSelected ? 0 : 1;
            let selectedB = itemB.generateSelected ? 0 : 1;
            if(selectedA !== selectedB){
                return selectedA - selectedB;
            }
            return this.compareNames(itemA, itemB);
        }
        if('position' === sortBy){
            return this.legendRowFirstTile(tileset, rowA, itemA) - this.legendRowFirstTile(tileset, rowB, itemB);
        }
        return this.compareNames(itemA, itemB);
    }

    legendRowItem(tileset, row)
    {
        if(row.classList.contains('spot-row')){
            return (tileset.spots || [])[Number(row.dataset.spotIndex)];
        }
        return tileset.elements[Number(row.dataset.elementIndex)];
    }

    compareNames(itemA, itemB)
    {
        let nameA = (itemA.name || '').toLowerCase();
        let nameB = (itemB.name || '').toLowerCase();
        if(nameA < nameB){
            return -1;
        }
        if(nameA > nameB){
            return 1;
        }
        return 0;
    }

    legendRowFirstTile(tileset, row, item)
    {
        if(row.classList.contains('spot-row')){
            return this.spotFirstTile(item);
        }
        return this.elementFirstTile(tileset, item);
    }

    elementFirstTile(tileset, element)
    {
        let minIndex = Number.MAX_SAFE_INTEGER;
        for(let tile of this.editor.app.collectElementTiles(element)){
            let flatIndex = tile[0] * tileset.tilesetColumns + tile[1];
            if(flatIndex < minIndex){
                minIndex = flatIndex;
            }
        }
        return minIndex;
    }

    spotFirstTile(spot)
    {
        let minIndex = this.minTileValue(Number.MAX_SAFE_INTEGER, spot.spotTile);
        for(let tileValue of spot.spotTileVariations || []){
            minIndex = this.minTileValue(minIndex, tileValue);
        }
        let tileMaps = [
            spot.surroundingTiles,
            spot.corners,
            spot.bordersTiles,
            spot.borderCornersTiles,
            spot.innerWallsTiles,
            spot.innerWallsCornerTiles,
            spot.outerWallsTiles,
            spot.outerWallsCornerTiles
        ];
        for(let tilesMap of tileMaps){
            minIndex = this.minMappedTiles(minIndex, tilesMap);
        }
        return minIndex;
    }

    minMappedTiles(minIndex, tilesMap)
    {
        if(!tilesMap){
            return minIndex;
        }
        for(let positionKey of Object.keys(tilesMap)){
            minIndex = this.minTileValue(minIndex, tilesMap[positionKey]);
        }
        return minIndex;
    }

    minTileValue(minIndex, tileValue)
    {
        if(!Number.isInteger(tileValue)){
            return minIndex;
        }
        return Math.min(minIndex, tileValue);
    }

    buildElementRow(frag, element, tilesetIndex, i)
    {
        let app = this.editor.app;
        let isSelected = app.selectedTileset === tilesetIndex && app.selectedElement === i;
        let row = frag.querySelector('.element-row');
        row.dataset.elementIndex = i;
        if(SharedUtils.CLUSTER_TYPE === element.type){
            row.classList.add('element-type-cluster');
        }
        let typeIcon = frag.querySelector('.element-type-icon');
        let isCluster = SharedUtils.CLUSTER_TYPE === element.type;
        typeIcon.src = isCluster ? SharedUtils.ICON_PATHS.cubes : SharedUtils.ICON_PATHS.cube;
        typeIcon.alt = element.type;
        typeIcon.title = element.type;
        let bulkCheckbox = frag.querySelector('.element-bulk-select');
        bulkCheckbox.checked = element.bulkSelected || false;
        let generateCheckbox = frag.querySelector('.element-generate-select');
        generateCheckbox.checked = element.generateSelected || false;
        let nameInput = frag.querySelector('.element-name-input');
        nameInput.value = element.name;
        let expanded = frag.querySelector('.element-expanded');
        if(isSelected){
            expanded.classList.remove('hidden');
        }
        let quantityInput = frag.querySelector('.element-quantity');
        quantityInput.value = element.quantity;
        let freeSpaceInput = frag.querySelector('.element-free-space');
        freeSpaceInput.value = element.freeSpaceAround;
        let allowPathsInput = frag.querySelector('.element-allow-paths');
        allowPathsInput.checked = element.allowPathsInFreeSpace;
        let mapCenteredInput = frag.querySelector('.element-map-centered');
        if(mapCenteredInput){
            mapCenteredInput.value = element.mapCentered || 0;
        }
        let isCustomActive = isSelected && !SharedUtils.KNOWN_LAYER_TYPES.includes(app.activeLayerType);
        let radioName = 'layer-type-t'+tilesetIndex+'-e'+i;
        let radios = frag.querySelectorAll('.layer-type-radio');
        let customInput = frag.querySelector('.layer-type-custom-input');
        customInput.value = app.customLayerSuffix;
        this.assignRadioNames(radios, radioName, isCustomActive, isSelected);
        SharedUtils.applyLockVisual(frag.querySelector('.element-lock-btn'), element.approved);
        this.applyElementTypeVisuals(frag, element);
    }

    applyElementTypeVisuals(frag, element)
    {
        let app = this.editor.app;
        let splitBtn = frag.querySelector('.cluster-split-btn');
        let convertBtn = frag.querySelector('.cluster-convert-btn');
        let aiControls = frag.querySelector('.element-ai-controls');
        let aiSelect = frag.querySelector('.element-ai-select');
        let aiDetectBtn = frag.querySelector('.element-ai-detect-btn');
        let isCluster = SharedUtils.CLUSTER_TYPE === element.type;
        if(isCluster){
            splitBtn.classList.remove('hidden');
            convertBtn.classList.remove('hidden');
        }
        if(!app.showAiControls || !app.activeProviders.length){
            return;
        }
        SharedUtils.populateProviderSelect(aiSelect, app.activeProviders);
        aiDetectBtn.textContent = isCluster ? 'Detect Elements' : 'Detect Layers';
        aiControls.classList.remove('hidden');
    }

    assignRadioNames(radios, radioName, isCustomActive, isSelected)
    {
        for(let radio of radios){
            radio.name = radioName;
            if(radio.classList.contains('layer-type-custom-radio')){
                radio.checked = isCustomActive;
                continue;
            }
            radio.checked = isSelected && radio.value === this.editor.app.activeLayerType;
        }
    }

    handleRadioChange(radio)
    {
        if(!radio.checked){
            return;
        }
        if(radio.classList.contains('layer-type-custom-radio')){
            this.editor.app.activeLayerType = this.editor.app.customLayerSuffix;
            this.refreshSelectedTileset();
            return;
        }
        this.editor.app.activeLayerType = radio.value;
        this.refreshSelectedTileset();
    }

    refreshSelectedTileset()
    {
        if(null === this.editor.app.selectedTileset){
            return;
        }
        this.editor.app.refresh(this.editor.app.selectedTileset);
    }

}
