class TilesetStateBuilder
{
    constructor(app)
    {
        this.app = app;
        this.rowBinder = new TilesetRowBinder(app);
    }

    normalizeImageUrl(imageUrl)
    {
        if(!imageUrl){
            return imageUrl;
        }
        if(imageUrl.startsWith('/tileset-image/')){
            return imageUrl.slice(1);
        }
        return imageUrl;
    }

    buildElementsList(elementsData, startIndex)
    {
        let elements = [];
        for(let elementData of elementsData){
            let colorIndex = startIndex + elements.length;
            let itemType = elementData.type || SharedUtils.ELEMENT_TYPE;
            let approved = elementData.approved !== undefined
                ? elementData.approved
                : SharedUtils.CLUSTER_TYPE !== itemType && SharedUtils.SPOT_TYPE !== itemType;
            let item = SharedUtils.makeElement(
                elementData.name, colorIndex, elementData.layers, approved, itemType
            );
            item.quantity = elementData.quantity || 1;
            item.freeSpaceAround = elementData.freeSpaceAround !== undefined ? elementData.freeSpaceAround : 1;
            item.allowPathsInFreeSpace = elementData.allowPathsInFreeSpace || false;
            elements.push(item);
        }
        return elements;
    }

    build(response)
    {
        this.app.state = [];
        this.app.selectedTileset = null;
        this.app.selectedElement = null;
        this.app.selectedSpot = null;
        this.app.refs = {};
        this.app.imageCache = {};
        this.globalElementIndex = 0;
        let container = this.app.getElement('.tilesets-container');
        container.textContent = '';
        this.append(response);
    }

    append(response)
    {
        this.app.sessionId = response.sessionId;
        this.app.showAiControls = response.showAiControls || false;
        this.app.activeProviders = response.activeProviders || [];
        let startIndex = this.app.state.length;
        let container = this.app.getElement('.tilesets-container');
        let template = this.app.getElement('.tileset-container-template');
        for(let i = 0; i < response.tilesets.length; i++){
            this.buildTileset(response.tilesets[i], startIndex + i, template, container, response.sessionId);
        }
        this.app.updatePaletteStyles();
        this.app.generator.updateGenerateButtonState();
    }

    buildTileset(tilesetData, i, template, container, sessionId)
    {
        let elements = this.buildElementsList(tilesetData.elements, this.globalElementIndex);
        this.globalElementIndex += elements.length;
        this.app.state.push({
            sessionId,
            imageUrl: this.normalizeImageUrl(tilesetData.imageUrl),
            imageId: tilesetData.imageId,
            filename: tilesetData.filename,
            filePath: tilesetData.filePath,
            imageWidth: tilesetData.imageWidth,
            imageHeight: tilesetData.imageHeight,
            tileWidth: tilesetData.tileWidth,
            tileHeight: tilesetData.tileHeight,
            spacing: tilesetData.spacing,
            margin: tilesetData.margin,
            tilesetColumns: tilesetData.tilesetColumns,
            tileRows: tilesetData.tileRows,
            tileCount: tilesetData.tileCount,
            bgColor: tilesetData.bgColor || null,
            filteredTiles: tilesetData.filteredTiles || [],
            originalTileWidth: tilesetData.originalTileWidth || tilesetData.tileWidth,
            originalTileHeight: tilesetData.originalTileHeight || tilesetData.tileHeight,
            resizeOption: tilesetData.resizeOption || 0,
            generatorType: tilesetData.generatorType || 'elements-composite-loader',
            associationsProperties: tilesetData.associationsProperties || null,
            tileOptions: tilesetData.tileOptions || null,
            spots: tilesetData.spots || [],
            elements
        });
        let tilesetFragment = template.content.cloneNode(true);
        let rowEl = tilesetFragment.querySelector('.tileset-row');
        rowEl.dataset.tilesetIndex = i;
        tilesetFragment.querySelector('.tileset-title').textContent = tilesetData.filename;
        tilesetFragment.querySelector('.tileset-map-name').value = SharedUtils.filenameToMapName(tilesetData.filename);
        tilesetFragment.querySelector('.tileset-map-title').value = SharedUtils.filenameToMapTitle(tilesetData.filename);
        let genType = tilesetData.generatorType ? tilesetData.generatorType : 'elements-composite-loader';
        this.appendFragmentAndBindRow(i, tilesetFragment, container, genType, tilesetData.associationsProperties);
    }

    loadFromSession(data)
    {
        let container = this.app.getElement('.tileset-analyzer');
        data.showAiControls = '1' === container.dataset.showAiControls;
        let providers = container.dataset.activeProviders;
        data.activeProviders = providers ? providers.split(',') : [];
        if(data.globalTileOptions){
            this.app.globalTileOptions = data.globalTileOptions;
            if(this.app.tileOptionsBinder){
                this.app.tileOptionsBinder.apply.applyToRow(-1, null);
            }
        }
        if(!this.app.state.length){
            this.build(data);
            this.app.showReviewSection();
            return;
        }
        for(let tilesetData of data.tilesets){
            this.syncSessionTileset(tilesetData);
        }
        this.app.updatePaletteStyles();
        this.app.generator.updateGenerateButtonState();
    }

    replaceSessionElements(tilesetIndex, elementsData)
    {
        let elements = this.buildElementsList(elementsData, this.globalElementIndex);
        this.globalElementIndex += elements.length;
        this.app.state[tilesetIndex].elements = elements;
        this.app.editor.renderLegend(tilesetIndex);
        this.app.renderer.renderCanvas(tilesetIndex);
    }

    findTilesetIndex(filename)
    {
        for(let j = 0; j < this.app.state.length; j++){
            if(this.app.state[j].filename === filename){
                return j;
            }
        }
        return -1;
    }

    syncSessionTileset(tilesetData)
    {
        let j = this.findTilesetIndex(tilesetData.filename);
        if(-1 === j){
            return;
        }
        this.app.state[j].tileOptions = tilesetData.tileOptions;
        this.app.state[j].spots = tilesetData.spots;
        this.replaceSessionElements(j, tilesetData.elements);
        if(this.app.tileOptionsBinder){
            this.app.tileOptionsBinder.applyToTilesetRow(j);
        }
    }

    appendOrReplace(response, overrideFilenames)
    {
        this.app.sessionId = response.sessionId;
        this.app.showAiControls = response.showAiControls || false;
        this.app.activeProviders = response.activeProviders || [];
        let container = this.app.getElement('.tilesets-container');
        let template = this.app.getElement('.tileset-container-template');
        for(let tilesetData of response.tilesets){
            let existingIndex = overrideFilenames.has(tilesetData.filename)
                ? this.findTilesetIndex(tilesetData.filename)
                : -1;
            if(-1 === existingIndex){
                this.buildTileset(tilesetData, this.app.state.length, template, container, response.sessionId);
                continue;
            }
            this.replaceFullTileset(existingIndex, tilesetData, response.sessionId);
        }
        this.app.updatePaletteStyles();
        this.app.generator.updateGenerateButtonState();
    }

    replaceFullTileset(existingIndex, tilesetData, sessionId)
    {
        let globalOffset = this.app.getGlobalOffset(existingIndex);
        let elements = this.buildElementsList(tilesetData.elements, globalOffset);
        let existing = this.app.state[existingIndex];
        existing.sessionId = sessionId;
        existing.imageUrl = this.normalizeImageUrl(tilesetData.imageUrl);
        existing.imageId = tilesetData.imageId;
        existing.filePath = tilesetData.filePath;
        existing.imageWidth = tilesetData.imageWidth;
        existing.imageHeight = tilesetData.imageHeight;
        existing.tileWidth = tilesetData.tileWidth;
        existing.tileHeight = tilesetData.tileHeight;
        existing.spacing = tilesetData.spacing;
        existing.margin = tilesetData.margin;
        existing.tilesetColumns = tilesetData.tilesetColumns;
        existing.tileRows = tilesetData.tileRows;
        existing.tileCount = tilesetData.tileCount;
        existing.bgColor = tilesetData.bgColor || null;
        existing.filteredTiles = tilesetData.filteredTiles || [];
        existing.originalTileWidth = tilesetData.originalTileWidth || tilesetData.tileWidth;
        existing.originalTileHeight = tilesetData.originalTileHeight || tilesetData.tileHeight;
        existing.resizeOption = tilesetData.resizeOption || 0;
        existing.generatorType = tilesetData.generatorType || 'elements-composite-loader';
        existing.associationsProperties = tilesetData.associationsProperties || null;
        existing.tileOptions = tilesetData.tileOptions || null;
        existing.spots = tilesetData.spots || [];
        existing.elements = elements;
        delete this.app.imageCache[existingIndex];
        let existingRow = document.querySelector('[data-tileset-index="'+existingIndex+'"]');
        if(existingRow){
            this.app.strategyEditor.applyToRow(
                existingRow,
                existing.generatorType,
                existing.associationsProperties
            );
        }
        this.app.refresh(existingIndex);
    }

    collectMapMeta()
    {
        let mapMeta = [];
        for(let j = 0; j < this.app.state.length; j++){
            let row = document.querySelector('[data-tileset-index="'+j+'"]');
            mapMeta.push({
                mapName: row ? row.querySelector('.tileset-map-name').value : '',
                mapTitle: row ? row.querySelector('.tileset-map-title').value : ''
            });
        }
        return mapMeta;
    }

    rebuildAllRows(mapMeta)
    {
        let container = this.app.getElement('.tilesets-container');
        container.textContent = '';
        let template = this.app.getElement('.tileset-container-template');
        for(let j = 0; j < this.app.state.length; j++){
            this.rebuildTilesetRow(j, template, container);
            let row = container.querySelector('[data-tileset-index="'+j+'"]');
            if(!row || !mapMeta[j]){
                continue;
            }
            row.querySelector('.tileset-map-name').value = mapMeta[j].mapName;
            row.querySelector('.tileset-map-title').value = mapMeta[j].mapTitle;
        }
    }

    removeTileset(i)
    {
        let mapMeta = this.collectMapMeta();
        mapMeta.splice(i, 1);
        this.app.state.splice(i, 1);
        this.app.selectedTileset = null;
        this.app.selectedElement = null;
        this.app.selectedSpot = null;
        this.app.refs = {};
        this.app.zoomLevels = {};
        this.app.imageCache = {};
        this.globalElementIndex = 0;
        this.rebuildAllRows(mapMeta);
        this.app.updatePaletteStyles();
        this.app.generator.updateGenerateButtonState();
        if(!this.app.state.length){
            this.app.hideReviewSection();
        }
    }

    appendFragmentAndBindRow(i, tilesetFragment, container, generatorType, assocProps)
    {
        container.appendChild(tilesetFragment);
        let row = container.querySelector('[data-tileset-index="'+i+'"]');
        this.rowBinder.bind(row, i);
        this.app.generator.bindTileset(row, i);
        this.app.merger.bindTileset(row, i);
        this.app.strategyEditor.applyToRow(row, generatorType, assocProps);
    }

    rebuildTilesetRow(i, template, container)
    {
        let tilesetData = this.app.state[i];
        let globalOffset = this.app.getGlobalOffset(i);
        for(let j = 0; j < tilesetData.elements.length; j++){
            tilesetData.elements[j].colorIndex = globalOffset + j;
            this.globalElementIndex++;
        }
        let tilesetFragment = template.content.cloneNode(true);
        tilesetFragment.querySelector('.tileset-row').dataset.tilesetIndex = i;
        tilesetFragment.querySelector('.tileset-title').textContent = tilesetData.filename;
        let genType = tilesetData.generatorType ? tilesetData.generatorType : 'elements-composite-loader';
        this.appendFragmentAndBindRow(i, tilesetFragment, container, genType, tilesetData.associationsProperties);
    }
}
