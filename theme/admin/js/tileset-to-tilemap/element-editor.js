class TilesetElementEditor
{
    constructor(app)
    {
        this.app = app;
        this.spotEditor = new TilesetSpotEditor(this);
        this.legendRenderer = new TilesetLegendRenderer(this);
        this.legendInteractions = new TilesetLegendInteractions(this);
        this.spotInteractions = new TilesetSpotInteractions(this);
        this.namer = new TilesetElementNamer(app);
        this.scroller = new TilesetLegendScroller(app);
    }


    renderLegend(tilesetIndex)
    {
        this.legendRenderer.renderLegend(tilesetIndex);
    }

    elementVisibilityFilter(refs)
    {
        return {
            showElements: refs && refs.showElementsCheck ? refs.showElementsCheck.checked : true,
            showClusters: refs && refs.showClustersCheck ? refs.showClustersCheck.checked : true,
            showSpots: refs && refs.showSpotsCheck ? refs.showSpotsCheck.checked : true,
            searchTerm: refs && refs.legendSearch ? refs.legendSearch.value.toLowerCase() : ''
        };
    }

    matchesVisibilityFilter(element, filter)
    {
        let isCluster = SharedUtils.CLUSTER_TYPE === element.type;
        let isSpot = SharedUtils.SPOT_TYPE === element.type;
        let matchesType = (isCluster && filter.showClusters)
            || (isSpot && filter.showSpots)
            || (!isCluster && !isSpot && filter.showElements);
        if(!matchesType){
            return false;
        }
        if(!filter.searchTerm){
            return true;
        }
        return Boolean(element.name) && element.name.toLowerCase().includes(filter.searchTerm);
    }

    computeElementVisibility(tilesetIndex)
    {
        return this.elementVisibilityFilter(this.app.refs[tilesetIndex]);
    }

    getBulkSelected(tilesetIndex)
    {
        let tileset = this.app.state[tilesetIndex];
        let result = { clusters: [], elements: [], spots: [] };
        for(let i = 0; i < tileset.elements.length; i++){
            let element = tileset.elements[i];
            if(!element.bulkSelected){
                continue;
            }
            if(SharedUtils.CLUSTER_TYPE === element.type){
                result.clusters.push(i);
                continue;
            }
            if(SharedUtils.SPOT_TYPE === element.type){
                result.spots.push(i);
                continue;
            }
            result.elements.push(i);
        }
        return result;
    }

    selectElement(tilesetIndex, elementIndex)
    {
        let previousIndex = this.app.selectedTileset === tilesetIndex ? this.app.selectedElement : null;
        let sameElement = this.app.selectedTileset === tilesetIndex
            && this.app.selectedElement === elementIndex;
        this.app.selectedTileset = sameElement ? null : tilesetIndex;
        this.app.selectedElement = sameElement ? null : elementIndex;
        if(!sameElement){
            this.app.showAllElements = true;
            this.app.viewAllMode = false;
            this.app.resetViewAllButtons();
        }
        this.applySelectionToLegend(tilesetIndex, previousIndex);
        this.app.renderer.renderCanvas(tilesetIndex);
    }

    withList(tilesetIndex, callback)
    {
        let refs = this.app.refs[tilesetIndex];
        if(!refs || !refs.list){
            return;
        }
        callback(refs.list);
    }

    withElementRows(tilesetIndex, callback)
    {
        this.withList(tilesetIndex, (list) => callback(list.querySelectorAll('.element-row')));
    }

    withElementRow(tilesetIndex, elementIndex, callback)
    {
        this.withElementRows(tilesetIndex, (rows) => {
            let row = rows[elementIndex];
            if(!row){
                return;
            }
            callback(row);
        });
    }

    applyElementTypeUpdate(tilesetIndex, elementIndex)
    {
        this.withElementRow(tilesetIndex, elementIndex, (row) => {
            let element = this.app.state[tilesetIndex].elements[elementIndex];
            let isCluster = SharedUtils.CLUSTER_TYPE === element.type;
            row.classList.toggle('element-type-cluster', isCluster);
            let typeIcon = row.querySelector('.element-type-icon');
            typeIcon.src = isCluster ? SharedUtils.ICON_PATHS.cubes : SharedUtils.ICON_PATHS.cube;
            typeIcon.alt = element.type;
            typeIcon.title = element.type;
            let nameInput = row.querySelector('.element-name-input');
            nameInput.value = element.name;
            let bulkCheckbox = row.querySelector('.element-bulk-select');
            if(bulkCheckbox){
                bulkCheckbox.checked = element.bulkSelected || false;
            }
            let splitBtn = row.querySelector('.cluster-split-btn');
            let convertBtn = row.querySelector('.cluster-convert-btn');
            splitBtn.classList.toggle('hidden', !isCluster);
            convertBtn.classList.toggle('hidden', !isCluster);
            this.applyLockVisuals(row, element);
        });
    }

    applyLockUpdate(tilesetIndex, elementIndex)
    {
        this.withElementRow(tilesetIndex, elementIndex, (row) => {
            let element = this.app.state[tilesetIndex].elements[elementIndex];
            this.applyLockVisuals(row, element);
        });
    }

    applyLockVisuals(row, element)
    {
        SharedUtils.applyLockVisual(row.querySelector('.element-lock-btn'), element.approved);
    }

    applySelectionToLegend(tilesetIndex, previousIndex)
    {
        this.withElementRows(tilesetIndex, (rows) => this.applySelectionRows(tilesetIndex, previousIndex, rows));
    }

    applySelectionRows(tilesetIndex, previousIndex, rows)
    {
        if(null !== previousIndex && rows[previousIndex]){
            let prevExpanded = rows[previousIndex].querySelector('.element-expanded');
            if(prevExpanded){
                prevExpanded.classList.add('hidden');
            }
        }
        if(this.app.selectedTileset === tilesetIndex && null !== this.app.selectedElement){
            let currentRow = rows[this.app.selectedElement];
            if(currentRow){
                let currentExpanded = currentRow.querySelector('.element-expanded');
                if(currentExpanded){
                    currentExpanded.classList.remove('hidden');
                }
            }
        }
    }

    removeElement(tilesetIndex, elementIndex)
    {
        this.app.state[tilesetIndex].elements.splice(elementIndex, 1);
        let wasSelected = this.app.selectedTileset === tilesetIndex
            && this.app.selectedElement === elementIndex;
        if(wasSelected){
            this.app.selectedElement = null;
            this.app.selectedTileset = null;
        }
        if(this.app.selectedTileset === tilesetIndex && this.app.selectedElement > elementIndex){
            this.app.selectedElement--;
        }
        this.app.updatePaletteStyles();
        this.surgicallyRemoveElementRow(tilesetIndex, elementIndex);
        this.app.renderer.renderCanvas(tilesetIndex);
    }

    surgicallyRemoveElementRow(tilesetIndex, elementIndex)
    {
        this.withElementRow(tilesetIndex, elementIndex, (row) => {
            row.remove();
            let remaining = this.app.refs[tilesetIndex].list.querySelectorAll('.element-row');
            for(let i = elementIndex; i < remaining.length; i++){
                remaining[i].dataset.elementIndex = i;
            }
        });
    }

    addElement(tilesetIndex)
    {
        let previousIndex = this.app.selectedTileset === tilesetIndex ? this.app.selectedElement : null;
        let totalElements = 0;
        for(let ts of this.app.state){
            totalElements += ts.elements.length;
        }
        let nextNumber = totalElements + 1;
        this.app.state[tilesetIndex].elements.push(
            SharedUtils.makeElement('element-'+SharedUtils.padNum(nextNumber), totalElements, [], true)
        );
        let elementIndex = this.app.state[tilesetIndex].elements.length - 1;
        this.app.selectedTileset = tilesetIndex;
        this.app.selectedElement = elementIndex;
        this.app.activeLayerType = SharedUtils.DEFAULT_LAYER_TYPE;
        this.app.updatePaletteStyles();
        this.appendNewElementRow(tilesetIndex, elementIndex);
        this.applySelectionToLegend(tilesetIndex, previousIndex);
        this.app.renderer.renderCanvas(tilesetIndex);
        this.scroller.scrollLegendToSelected(tilesetIndex);
    }

    appendNewElementRow(tilesetIndex, elementIndex)
    {
        let template = this.app.getElement('.element-row-template');
        if(!template){
            return;
        }
        this.withList(tilesetIndex, (list) => {
            let element = this.app.state[tilesetIndex].elements[elementIndex];
            let frag = template.content.cloneNode(true);
            this.legendRenderer.buildElementRow(frag, element, tilesetIndex, elementIndex);
            list.insertBefore(frag, list.querySelector('.spot-row'));
            this.legendRenderer.applyLegendVisibility(tilesetIndex);
        });
    }

    splitCluster(tilesetIndex, elementIndex)
    {
        let tileset = this.app.state[tilesetIndex];
        let cluster = tileset.elements[elementIndex];
        let allTiles = this.app.collectElementTiles(cluster);
        let baseName = cluster.name;
        let globalOffset = this.app.getGlobalOffset(tilesetIndex);
        let newElements = [];
        for(let ti = 0; ti < allTiles.length; ti++){
            newElements.push(SharedUtils.makeElement(
                baseName+'-'+SharedUtils.padNum(ti + 1),
                globalOffset + elementIndex + ti,
                [{ type: 'collisions', tiles: [allTiles[ti]] }],
                false,
                SharedUtils.CLUSTER_TYPE
            ));
        }
        tileset.elements.splice(elementIndex, 1, ...newElements);
        this.app.reindexColors(tilesetIndex);
        this.app.clearSelection(tilesetIndex);
    }

    bulkConvert(tilesetIndex)
    {
        let elements = this.app.state[tilesetIndex].elements;
        let affected = [];
        for(let i = 0; i < elements.length; i++){
            let element = elements[i];
            if(!element.bulkSelected || SharedUtils.CLUSTER_TYPE !== element.type){
                continue;
            }
            element.name = this.namer.resolveConvertName(tilesetIndex, i, element.name);
            element.type = SharedUtils.ELEMENT_TYPE;
            element.approved = true;
            element.bulkSelected = false;
            affected.push(i);
        }
        this.app.generator.updateGenerateButtonState();
        for(let i of affected){
            this.applyElementTypeUpdate(tilesetIndex, i);
        }
        this.app.renderer.renderCanvas(tilesetIndex);
    }

    bulkToggleLock(tilesetIndex)
    {
        let elements = this.app.state[tilesetIndex].elements;
        for(let i = 0; i < elements.length; i++){
            let element = elements[i];
            if(!element.bulkSelected){
                continue;
            }
            element.approved = !element.approved;
            this.applyLockUpdate(tilesetIndex, i);
        }
    }
}
window.TilesetElementEditor = TilesetElementEditor;
