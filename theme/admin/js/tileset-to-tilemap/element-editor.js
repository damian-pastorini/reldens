class TilesetElementEditor
{
    constructor(app)
    {
        this.app = app;
        this.spotEditor = new TilesetSpotEditor(this);
        this.legendRenderer = new TilesetLegendRenderer(this);
    }

    renderLegend(tilesetIndex)
    {
        this.legendRenderer.renderLegend(tilesetIndex);
    }

    selectElement(tilesetIndex, elementIndex)
    {
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
        this.app.refresh(tilesetIndex);
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
        this.app.refresh(tilesetIndex);
    }

    addElement(tilesetIndex)
    {
        let totalElements = 0;
        for(let ts of this.app.state){
            totalElements += ts.elements.length;
        }
        let num = totalElements + 1;
        this.app.state[tilesetIndex].elements.push(
            SharedUtils.makeElement('element-'+SharedUtils.padNum(num), totalElements, [], true)
        );
        this.app.selectedTileset = tilesetIndex;
        this.app.selectedElement = this.app.state[tilesetIndex].elements.length - 1;
        this.app.activeLayerType = 'below-player';
        this.app.updatePaletteStyles();
        this.app.refresh(tilesetIndex);
        this.scrollLegendToSelected(tilesetIndex);
    }

    scrollLegendToSelected(tilesetIndex)
    {
        if(this.app.selectedTileset !== tilesetIndex){
            return;
        }
        if(null === this.app.selectedElement){
            return;
        }
        let list = this.app.refs[tilesetIndex].list;
        let rows = list.querySelectorAll('.element-row');
        let targetRow = rows[this.app.selectedElement];
        if(!targetRow){
            return;
        }
        list.scrollTop = targetRow.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
    }

    scrollLegendToSpot(tilesetIndex, spotIndex)
    {
        let list = this.app.refs[tilesetIndex].list;
        let spots = this.app.state[tilesetIndex].spots;
        if(!spots || !spots[spotIndex]){
            return;
        }
        let row = list.querySelector('.spot-row[data-spot-name="'+spots[spotIndex].name+'"]');
        if(!row){
            return;
        }
        list.scrollTop = row.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
    }

    scrollCanvasToElement(tilesetIndex, elementIndex)
    {
        let tileset = this.app.state[tilesetIndex];
        let element = tileset.elements[elementIndex];
        if(!element){
            return;
        }
        let allTiles = this.app.collectElementTiles(element);
        if(!allTiles.length){
            return;
        }
        let firstTile = [...allTiles].shift();
        let minRow = firstTile[0];
        let minCol = firstTile[1];
        for(let tile of allTiles){
            if(tile[0] < minRow){
                minRow = tile[0];
            }
            if(tile[1] < minCol){
                minCol = tile[1];
            }
        }
        let tilePos = this.app.tileGeometry.getTilePosition(tileset, [minRow, minCol]);
        let zoom = this.app.zoomLevels[tilesetIndex] || 1;
        let panel = this.app.refs[tilesetIndex].canvas.parentElement;
        panel.scrollLeft = Math.max(0, tilePos.x * zoom - panel.clientWidth / 2);
        panel.scrollTop = Math.max(0, tilePos.y * zoom - panel.clientHeight / 2);
    }

    splitCluster(tilesetIndex, elementIndex)
    {
        let tileset = this.app.state[tilesetIndex];
        let cluster = tileset.elements[elementIndex];
        let allTiles = this.app.collectElementTiles(cluster);
        let clusterNum = SharedUtils.padNum(elementIndex + 1);
        let newElements = [];
        for(let ti = 0; ti < allTiles.length; ti++){
            newElements.push(SharedUtils.makeElement(
                'element-cluster-'+clusterNum+'-'+SharedUtils.padNum(ti + 1),
                0,
                [{ type: 'collisions', tiles: [allTiles[ti]] }],
                true
            ));
        }
        tileset.elements.splice(elementIndex, 1, ...newElements);
        this.app.reindexColors(tilesetIndex);
        this.app.clearSelection(tilesetIndex);
    }

    countElementsInTileset(ts)
    {
        let count = 0;
        for(let el of ts.elements){
            if('element' === el.type){
                count++;
            }
        }
        return count;
    }

    resolveConvertName(tilesetIndex, index, name)
    {
        if(!name.startsWith('cluster-')){
            return this.resolveUniqueName(tilesetIndex, index, name);
        }
        let elementCount = 0;
        for(let ts of this.app.state){
            elementCount += this.countElementsInTileset(ts);
        }
        return this.resolveUniqueName(
            tilesetIndex, index, 'element-'+SharedUtils.padNum(elementCount + 1)
        );
    }

    bulkConvert(tilesetIndex)
    {
        let elements = this.app.state[tilesetIndex].elements;
        for(let i = 0; i < elements.length; i++){
            let el = elements[i];
            if(!el.bulkSelected){
                continue;
            }
            if('cluster' !== el.type){
                continue;
            }
            let newName = this.resolveConvertName(tilesetIndex, i, el.name);
            el.type = 'element';
            el.approved = true;
            el.name = newName;
            el.bulkSelected = false;
        }
        this.app.generator.updateGenerateButtonState();
        this.app.refresh(tilesetIndex);
    }

    resolveUniqueName(tilesetIndex, excludeIndex, name)
    {
        let elements = this.app.state[tilesetIndex].elements;
        let nameTaken = false;
        let maxSuffix = 1;
        let prefix = name+'-';
        for(let i = 0; i < elements.length; i++){
            if(i === excludeIndex){
                continue;
            }
            if(elements[i].name === name){
                nameTaken = true;
            }
            if(elements[i].name.startsWith(prefix)){
                let suffix = Number(elements[i].name.slice(prefix.length));
                if(suffix > maxSuffix){
                    maxSuffix = suffix;
                }
            }
        }
        if(!nameTaken){
            return name;
        }
        return name+'-'+SharedUtils.padNum(maxSuffix + 1);
    }

    bulkToggleLock(tilesetIndex)
    {
        let elements = this.app.state[tilesetIndex].elements;
        for(let el of elements){
            if(!el.bulkSelected){
                continue;
            }
            el.approved = !el.approved;
        }
        this.renderLegend(tilesetIndex);
    }
}
