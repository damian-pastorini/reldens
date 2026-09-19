class ElementTilesLayerEditor
{
    constructor(editor)
    {
        this.editor = editor;
        this.modal = null;
        this.canvasView = null;
        this.suffixInput = null;
        this.targetElement = null;
        this.workingLayers = null;
        this.activeLayerType = 'below-player';
        this.useCustom = false;
        this.standardTypes = [
            {value: 'below-player', label: 'Below player'},
            {value: 'collisions', label: 'Collisions'},
            {value: 'over-player', label: 'Over player'},
            {value: 'collisions-over-player', label: 'Collisions + over player'},
            {value: 'base', label: 'Base'}
        ];
    }

    open(instanceId)
    {
        let element = this.editor.mover.findByInstance(instanceId);
        if(!element){
            return;
        }
        this.targetElement = element;
        this.workingLayers = this.cloneLayers(element.layers);
        this.activeLayerType = 'below-player';
        this.useCustom = false;
        this.buildModal();
        this.canvasView.render(this.workingLayers);
    }

    cloneLayers(layers)
    {
        let cloned = [];
        for(let layer of layers){
            cloned.push({name: layer.name, type: layer.type, tiles: this.cloneTiles(layer.tiles)});
        }
        return cloned;
    }

    cloneTiles(tiles)
    {
        let cloned = [];
        for(let tile of tiles){
            cloned.push({col: tile.col, row: tile.row, gid: tile.gid});
        }
        return cloned;
    }

    buildModal()
    {
        this.modal = document.createElement('div');
        this.modal.className = 'modal element-tiles-layer-modal';
        let backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        backdrop.addEventListener('click', () => this.close());
        let dialog = document.createElement('div');
        dialog.className = 'modal-dialog modal-width-auto';
        dialog.appendChild(this.buildHeader());
        dialog.appendChild(this.buildBody());
        dialog.appendChild(this.buildFooter());
        this.modal.appendChild(backdrop);
        this.modal.appendChild(dialog);
        document.body.appendChild(this.modal);
    }

    buildHeader()
    {
        let header = document.createElement('div');
        header.className = 'modal-header';
        let title = document.createElement('h2');
        title.textContent = 'Edit tiles layers: '+this.targetElement.instanceId;
        header.appendChild(title);
        return header;
    }

    buildBody()
    {
        let body = document.createElement('div');
        body.className = 'modal-body';
        let hint = document.createElement('p');
        hint.textContent = 'Pick a layer type, then click a tile to reassign it to that layer.';
        body.appendChild(hint);
        this.canvasView = new ElementTilesLayerCanvas(this.editor, (col, row) => this.reassignCell(col, row));
        body.appendChild(this.canvasView.canvas);
        body.appendChild(this.buildFieldset());
        return body;
    }

    buildFieldset()
    {
        let fieldset = document.createElement('fieldset');
        fieldset.className = 'layer-type-fieldset';
        let legend = document.createElement('legend');
        legend.textContent = 'Layer type for reassigned tiles';
        fieldset.appendChild(legend);
        for(let typeItem of this.standardTypes){
            fieldset.appendChild(this.buildTypeOption(typeItem.value, typeItem.label));
        }
        fieldset.appendChild(this.buildCustomOption());
        return fieldset;
    }

    buildTypeOption(value, label)
    {
        let optionLabel = document.createElement('label');
        let radio = document.createElement('input');
        radio.type = 'radio';
        radio.className = 'layer-type-radio';
        radio.name = 'element-tiles-layer-type';
        radio.value = value;
        radio.checked = (this.activeLayerType === value);
        radio.addEventListener('change', () => this.selectStandardType(value));
        let swatch = document.createElement('span');
        swatch.className = 'layer-color-swatch layer-color-'+value;
        optionLabel.appendChild(radio);
        optionLabel.appendChild(swatch);
        optionLabel.appendChild(document.createTextNode(' '+label));
        return optionLabel;
    }

    buildCustomOption()
    {
        let optionLabel = document.createElement('label');
        let radio = document.createElement('input');
        radio.type = 'radio';
        radio.className = 'layer-type-radio layer-type-custom-radio';
        radio.name = 'element-tiles-layer-type';
        radio.value = 'custom';
        radio.addEventListener('change', () => this.selectCustomType());
        let swatch = document.createElement('span');
        swatch.className = 'layer-color-swatch layer-color-custom';
        this.suffixInput = document.createElement('input');
        this.suffixInput.type = 'text';
        this.suffixInput.className = 'layer-type-custom-input';
        this.suffixInput.placeholder = 'suffix';
        this.suffixInput.addEventListener('focus', () => this.selectCustomType());
        optionLabel.appendChild(radio);
        optionLabel.appendChild(swatch);
        optionLabel.appendChild(document.createTextNode(' Custom: '));
        optionLabel.appendChild(this.suffixInput);
        return optionLabel;
    }

    buildFooter()
    {
        let footer = document.createElement('div');
        footer.className = 'modal-footer';
        footer.appendChild(this.editor.ui.buildButton('Cancel', 'button-secondary', () => this.close()));
        footer.appendChild(this.editor.ui.buildButton('Save changes', 'button-primary', () => this.save()));
        return footer;
    }

    selectStandardType(value)
    {
        this.useCustom = false;
        this.activeLayerType = value;
    }

    selectCustomType()
    {
        this.useCustom = true;
        let customRadio = this.modal.querySelector('.layer-type-custom-radio');
        if(customRadio){
            customRadio.checked = true;
        }
    }

    resolveActiveType()
    {
        if(!this.useCustom){
            return this.activeLayerType;
        }
        return this.suffixInput ? this.suffixInput.value.trim() : '';
    }

    reassignCell(col, row)
    {
        let targetType = this.resolveActiveType();
        if('' === targetType){
            return;
        }
        let movedGid = this.removeCellFromLayers(col, row);
        if(null === movedGid){
            return;
        }
        this.findOrCreateLayer(targetType).tiles.push({col, row, gid: movedGid});
        this.canvasView.render(this.workingLayers);
    }

    removeCellFromLayers(col, row)
    {
        let gid = null;
        for(let layer of this.workingLayers){
            let found = this.removeCellFromLayer(layer, col, row);
            if(null !== found){
                gid = found;
            }
        }
        return gid;
    }

    removeCellFromLayer(layer, col, row)
    {
        let gid = null;
        let kept = [];
        for(let tile of layer.tiles){
            if(tile.col === col && tile.row === row){
                gid = tile.gid;
                continue;
            }
            kept.push(tile);
        }
        layer.tiles = kept;
        return gid;
    }

    findOrCreateLayer(type)
    {
        for(let layer of this.workingLayers){
            if(layer.type === type){
                return layer;
            }
        }
        let created = {name: this.targetElement.instanceId+'-'+type, type, tiles: []};
        this.workingLayers.push(created);
        return created;
    }

    save()
    {
        let pruned = [];
        for(let layer of this.workingLayers){
            if(0 < layer.tiles.length){
                pruned.push(layer);
            }
        }
        this.targetElement.layers = pruned;
        this.editor.markDirty();
        this.editor.requestRender();
        this.close();
    }

    close()
    {
        if(this.modal){
            this.modal.remove();
            this.modal = null;
        }
        this.targetElement = null;
        this.workingLayers = null;
    }
}
window.ElementTilesLayerEditor = ElementTilesLayerEditor;
