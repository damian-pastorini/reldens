class TilesetSpotEditor
{
    constructor(editor)
    {
        this.editor = editor;
    }

    getSpotNumberProps()
    {
        return [
            ['spot-width', 'width'],
            ['spot-height', 'height'],
            ['spot-quantity', 'quantity'],
            ['spot-map-centered', 'mapCentered'],
            ['spot-mark-percentage', 'markPercentage'],
            ['spot-variable-tiles-pct', 'variableTilesPercentage'],
            ['spot-free-space', 'freeSpaceAround'],
            ['spot-border-outer-walls-size', 'borderOuterWallsIncreaseLayerSize']
        ];
    }

    getSpotStringProps()
    {
        return [
            ['spot-layer-name', 'layerName'],
            ['spot-border-layer-suffix', 'borderLayerSuffix'],
            ['spot-walls-layer-suffix', 'wallsLayerSuffix'],
            ['spot-outer-walls-suffix', 'outerWallsLayerSuffix']
        ];
    }

    getSpotBindCheckboxProps()
    {
        return [
            ['spot-walkable', 'walkable'],
            ['spot-allow-paths', 'allowPathsInFreeSpace'],
            ['spot-place-random-path', 'placeRandomPath'],
            ['spot-depth', 'depth'],
            ['spot-split-borders', 'splitBordersInLayers']
        ];
    }

    getSpotCheckboxProps()
    {
        return [['spot-is-element', 'isElement'], ...this.getSpotBindCheckboxProps()];
    }

    populatePropValues(frag, spot, props)
    {
        for(let pair of props){
            let el = frag.querySelector('.'+pair[0]);
            if(el && spot[pair[1]] !== undefined){
                el.value = spot[pair[1]];
            }
        }
    }

    appendSpotRow(list, spot, si, tileset, tilesetIndex, spotTemplate)
    {
        let capturedSi = si;
        let frag = spotTemplate.content.cloneNode(true);
        let spotRow = frag.querySelector('.spot-row');
        spotRow.dataset.spotName = spot.name;
        let nameInput = frag.querySelector('.spot-name-input');
        nameInput.value = spot.name || '';
        let detail = frag.querySelector('.spot-detail');
        let spotHeader = frag.querySelector('.spot-row-header');
        let deleteBtn = frag.querySelector('.spot-delete-btn');
        let lockBtn = frag.querySelector('.spot-lock-btn');
        let lockIcon = lockBtn ? lockBtn.querySelector('.lock-icon') : null;
        this.bindSpotBulkCheckbox(frag, spot, tileset, capturedSi);
        this.bindSpotLockBtn(lockBtn, lockIcon, spot, tileset, capturedSi);
        spotHeader.addEventListener('click', (e) => {
            if(e.target === nameInput){
                return;
            }
            if(lockBtn && (e.target === lockBtn || lockBtn.contains(e.target))){
                return;
            }
            if(e.target === deleteBtn || deleteBtn.contains(e.target)){
                return;
            }
            detail.classList.toggle('hidden');
            let app = this.editor.app;
            let wasSelected = app.selectedSpot
                && app.selectedSpot.tilesetIndex === tilesetIndex
                && app.selectedSpot.spotIndex === capturedSi;
            app.selectedSpot = wasSelected ? null : { tilesetIndex, spotIndex: capturedSi };
            app.refresh(tilesetIndex);
        });
        this.populateSpotProps(frag, spot);
        this.bindSpotPropInputs(frag, spot);
        nameInput.addEventListener('blur', () => {
            tileset.spots[capturedSi].name = nameInput.value;
            this.editor.renderLegend(tilesetIndex);
        });
        deleteBtn.addEventListener('click', () => {
            let spotName = tileset.spots[capturedSi].name;
            if(this.editor.app.tileOptionsBinder
                && this.editor.app.tileOptionsBinder.activeSpotName === spotName){
                this.editor.app.tileOptionsBinder.deactivate();
            }
            tileset.spots.splice(capturedSi, 1);
            this.editor.renderLegend(tilesetIndex);
        });
        list.appendChild(frag);
    }

    bindSpotBulkCheckbox(frag, spot, tileset, capturedSi)
    {
        let bulkCheckbox = frag.querySelector('.spot-bulk-select');
        if(!bulkCheckbox){
            return;
        }
        bulkCheckbox.checked = spot.bulkSelected || false;
        bulkCheckbox.addEventListener('click', (e) => e.stopPropagation());
        bulkCheckbox.addEventListener('change', () => {
            tileset.spots[capturedSi].bulkSelected = bulkCheckbox.checked;
        });
    }

    bindSpotLockBtn(lockBtn, lockIcon, spot, tileset, capturedSi)
    {
        if(!lockBtn){
            return;
        }
        if(spot.approved){
            lockBtn.classList.add('locked');
            if(lockIcon){
                lockIcon.src = '/assets/admin/lock-solid.svg';
            }
        }
        lockBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            tileset.spots[capturedSi].approved = !tileset.spots[capturedSi].approved;
            lockBtn.classList.toggle('locked', tileset.spots[capturedSi].approved);
            if(lockIcon){
                lockIcon.src = '/assets/admin/'+(tileset.spots[capturedSi].approved ? 'lock-solid' : 'unlock-solid')+'.svg';
            }
        });
    }

    populateSpotProps(frag, spot)
    {
        this.populatePropValues(frag, spot, this.getSpotNumberProps());
        this.populatePropValues(frag, spot, this.getSpotStringProps());
        for(let pair of this.getSpotCheckboxProps()){
            let el = frag.querySelector('.'+pair[0]);
            if(el){
                el.checked = spot[pair[1]] || false;
            }
        }
        let freeSpaceRow = frag.querySelector('.spot-free-space-row');
        let allowPathsRow = frag.querySelector('.spot-allow-paths-row');
        if(freeSpaceRow){
            freeSpaceRow.classList.toggle('hidden', !spot.isElement);
        }
        if(allowPathsRow){
            allowPathsRow.classList.toggle('hidden', !spot.isElement);
        }
    }

    bindSpotPropInputs(frag, spot)
    {
        let isElementInput = frag.querySelector('.spot-is-element');
        let freeSpaceRow = frag.querySelector('.spot-free-space-row');
        let allowPathsRow = frag.querySelector('.spot-allow-paths-row');
        if(isElementInput){
            isElementInput.addEventListener('change', () => {
                spot.isElement = isElementInput.checked;
                if(freeSpaceRow){
                    freeSpaceRow.classList.toggle('hidden', !isElementInput.checked);
                }
                if(allowPathsRow){
                    allowPathsRow.classList.toggle('hidden', !isElementInput.checked);
                }
            });
        }
        for(let pair of this.getSpotNumberProps()){
            let el = frag.querySelector('.'+pair[0]);
            if(el){
                let key = pair[1];
                el.addEventListener('input', () => {
                    spot[key] = Number(el.value);
                });
            }
        }
        for(let pair of this.getSpotStringProps()){
            let el = frag.querySelector('.'+pair[0]);
            if(el){
                let key = pair[1];
                el.addEventListener('input', () => {
                    spot[key] = el.value;
                });
            }
        }
        for(let pair of this.getSpotBindCheckboxProps()){
            let el = frag.querySelector('.'+pair[0]);
            if(el){
                let key = pair[1];
                el.addEventListener('change', () => {
                    spot[key] = el.checked;
                });
            }
        }
    }
}
