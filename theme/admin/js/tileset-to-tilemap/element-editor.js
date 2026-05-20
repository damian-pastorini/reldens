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

    selectElement(tilesetIndex, elementIndex)
    {
        let previousIndex = this.app.selectedTileset === tilesetIndex ? this.app.selectedElement : null;
        let sameElement = this.app.selectedTileset === tilesetIndex
            && this.app.selectedElement === elementIndex;
        this.app.selectedTileset = sameElement ? null : tilesetIndex;
        this.app.selectedElement = sameElement ? null : elementIndex;
        this.app.activeLayerType = sameElement ? this.app.activeLayerType : 'below-player';
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
            row.classList.toggle('element-type-cluster', 'cluster' === element.type);
            let typeIcon = row.querySelector('.element-type-icon');
            typeIcon.src = '/assets/admin/'+('cluster' === element.type ? 'cubes-solid-full' : 'cube-solid-full')+'.svg';
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
            splitBtn.classList.toggle('hidden', 'cluster' !== element.type);
            convertBtn.classList.toggle('hidden', 'cluster' !== element.type);
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
        let lockBtn = row.querySelector('.element-lock-btn');
        if(!lockBtn){
            return;
        }
        lockBtn.classList.toggle('locked', element.approved);
        let lockIcon = lockBtn.querySelector('.lock-icon');
        if(lockIcon){
            lockIcon.src = '/assets/admin/'+(element.approved ? 'lock-solid' : 'unlock-solid')+'.svg';
        }
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
        this.app.activeLayerType = 'below-player';
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
        let newElements = [];
        for(let ti = 0; ti < allTiles.length; ti++){
            newElements.push(SharedUtils.makeElement(
                baseName+'-'+SharedUtils.padNum(ti + 1),
                0,
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
            if(!element.bulkSelected || 'cluster' !== element.type){
                continue;
            }
            element.name = this.namer.resolveConvertName(tilesetIndex, i, element.name);
            element.type = 'element';
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
