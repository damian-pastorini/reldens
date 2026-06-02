class MapResizer
{
    constructor(editor)
    {
        this.editor = editor;
        this.anchorKeys = [
            'top-left', 'top-center', 'top-right',
            'left', 'center', 'right',
            'bottom-left', 'bottom-center', 'bottom-right'
        ];
        this.anchor = 'center';
        this.removeHorizontal = 0;
        this.removeVertical = 0;
        this.anchorButtons = {};
        this.horizontalInput = null;
        this.verticalInput = null;
        this.errorEl = null;
    }

    buildPanelInto(panel)
    {
        let picker = document.createElement('div');
        picker.className = 'resize-anchor-picker';
        for(let key of this.anchorKeys){
            picker.appendChild(this.buildAnchorButton(key));
        }
        panel.appendChild(picker);
        this.horizontalInput = this.buildNumberInput('Remove horizontal', 0);
        panel.appendChild(this.horizontalInput.wrapper);
        this.verticalInput = this.buildNumberInput('Remove vertical', 0);
        panel.appendChild(this.verticalInput.wrapper);
        this.errorEl = document.createElement('p');
        this.errorEl.className = 'resize-error hidden';
        panel.appendChild(this.errorEl);
        panel.appendChild(EditorButtonFactory.create(
            'Apply resize',
            'button-primary',
            () => this.handleApplyClick()
        ));
        this.highlightAnchor(this.anchor);
    }

    handleApplyClick()
    {
        let result = this.applyFromPanel();
        this.showResult(result);
    }

    showResult(result)
    {
        if(!this.errorEl){
            return;
        }
        if(result.success){
            this.errorEl.classList.add('hidden');
            this.errorEl.textContent = '';
            return;
        }
        this.errorEl.classList.remove('hidden');
        if(result.offending && 0 < result.offending.length){
            this.errorEl.textContent = 'Cannot resize: these elements would fall outside the new bounds: '
                +result.offending.join(', ');
            return;
        }
        this.errorEl.textContent = 'Resize failed.';
    }

    buildAnchorButton(key)
    {
        let button = document.createElement('button');
        button.type = 'button';
        button.dataset.anchorKey = key;
        button.title = key;
        button.addEventListener('click', () => this.highlightAnchor(key));
        this.anchorButtons[key] = button;
        return button;
    }

    buildNumberInput(label, initial)
    {
        let wrapper = document.createElement('label');
        wrapper.textContent = label+': ';
        let input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.value = String(initial);
        wrapper.appendChild(input);
        return {wrapper, input};
    }

    highlightAnchor(key)
    {
        this.anchor = key;
        for(let anchorKey of this.anchorKeys){
            let button = this.anchorButtons[anchorKey];
            if(!button){
                continue;
            }
            button.classList.toggle('selected', anchorKey === key);
        }
    }

    applyFromPanel()
    {
        this.setInput(this.anchor, this.horizontalInput.input.value, this.verticalInput.input.value);
        let result = this.apply();
        if(result.success){
            this.horizontalInput.input.value = '0';
            this.verticalInput.input.value = '0';
        }
        return result;
    }

    setInput(anchor, removeHorizontal, removeVertical)
    {
        this.anchor = anchor;
        this.removeHorizontal = Math.max(0, Number(removeHorizontal) || 0);
        this.removeVertical = Math.max(0, Number(removeVertical) || 0);
    }

    computeRemovals()
    {
        return {
            left: this.leftRemoved(this.anchor, this.removeHorizontal),
            top: this.topRemoved(this.anchor, this.removeVertical)
        };
    }

    leftRemoved(anchor, total)
    {
        if(-1 !== anchor.indexOf('right')){
            return total;
        }
        if('center' === anchor || -1 !== anchor.indexOf('top-center') || -1 !== anchor.indexOf('bottom-center')){
            return Math.floor(total / 2);
        }
        return 0;
    }

    topRemoved(anchor, total)
    {
        if(-1 !== anchor.indexOf('bottom')){
            return total;
        }
        if('center' === anchor || 'left' === anchor || 'right' === anchor){
            return Math.floor(total / 2);
        }
        return 0;
    }

    findOutOfBoundsElements()
    {
        let removals = this.computeRemovals();
        let newWidth = this.editor.mapJson.width - this.removeHorizontal;
        let newHeight = this.editor.mapJson.height - this.removeVertical;
        let offending = [];
        for(let element of this.editor.mapElements.elements){
            if(this.elementWouldEscape(element, removals, newWidth, newHeight)){
                offending.push(element.instanceId);
            }
        }
        return offending;
    }

    elementWouldEscape(element, removals, newWidth, newHeight)
    {
        return element.layers.some(
            (layer) => layer.tiles.some(
                (tile) => this.tileEscapes(tile, removals, newWidth, newHeight)
            )
        );
    }

    tileEscapes(tile, removals, newWidth, newHeight)
    {
        let newCol = tile.col - removals.left;
        if(0 > newCol || newCol >= newWidth){
            return true;
        }
        return 0 > tile.row - removals.top || tile.row - removals.top >= newHeight;
    }

    apply()
    {
        let offending = this.findOutOfBoundsElements();
        if(0 < offending.length){
            return {success: false, offending};
        }
        let removals = this.computeRemovals();
        let newWidth = this.editor.mapJson.width - this.removeHorizontal;
        let newHeight = this.editor.mapJson.height - this.removeVertical;
        this.translateAllElements(removals);
        this.rebuildLayerData(newWidth, newHeight, removals);
        this.editor.mapJson.width = newWidth;
        this.editor.mapJson.height = newHeight;
        MapResizerBorders.restamp(this.editor, newWidth, newHeight);
        this.editor.markDirty();
        this.editor.afterMutation();
        return {success: true};
    }

    translateAllElements(removals)
    {
        for(let element of this.editor.mapElements.elements){
            this.translateElementTiles(element, removals);
            element.bounds.col -= removals.left;
            element.bounds.row -= removals.top;
        }
    }

    translateElementTiles(element, removals)
    {
        for(let elementLayer of element.layers){
            this.shiftTiles(elementLayer.tiles, removals);
        }
    }

    shiftTiles(tiles, removals)
    {
        for(let tile of tiles){
            tile.col -= removals.left;
            tile.row -= removals.top;
        }
    }

    rebuildLayerData(newWidth, newHeight, removals)
    {
        let oldWidth = this.editor.mapJson.width;
        for(let mapLayer of this.editor.mapJson.layers){
            if('tilelayer' !== mapLayer.type){
                continue;
            }
            mapLayer.data = this.cropLayerData(mapLayer.data, oldWidth, newWidth, newHeight, removals);
            mapLayer.width = newWidth;
            mapLayer.height = newHeight;
        }
    }

    cropLayerData(oldData, oldWidth, newWidth, newHeight, removals)
    {
        let newData = new Array(newWidth * newHeight).fill(0);
        for(let row = 0; row < newHeight; row++){
            this.copyRow(oldData, newData, row, oldWidth, newWidth, removals);
        }
        return newData;
    }

    copyRow(oldData, newData, row, oldWidth, newWidth, removals)
    {
        let oldRow = row + removals.top;
        for(let col = 0; col < newWidth; col++){
            newData[row * newWidth + col] = oldData[oldRow * oldWidth + (col + removals.left)] || 0;
        }
    }
}
window.MapResizer = MapResizer;
