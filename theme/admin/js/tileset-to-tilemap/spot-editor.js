class TilesetSpotEditor
{
    constructor(editor)
    {
        this.editor = editor;
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
        if(this.editor.app.selectedSpot
            && this.editor.app.selectedSpot.tilesetIndex === tilesetIndex
            && this.editor.app.selectedSpot.spotIndex === si){
            detail.classList.remove('hidden');
        }
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
            let app = this.editor.app;
            let wasSelected = app.selectedSpot
                && app.selectedSpot.tilesetIndex === tilesetIndex
                && app.selectedSpot.spotIndex === capturedSi;
            app.selectedSpot = wasSelected ? null : { tilesetIndex, spotIndex: capturedSi };
            app.refresh(tilesetIndex);
        });
        this.initSpotProps(frag, spot);
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

    toggleIsElementRows(freeSpaceRow, allowPathsRow, checked)
    {
        if(freeSpaceRow){
            freeSpaceRow.classList.toggle('hidden', !checked);
        }
        if(allowPathsRow){
            allowPathsRow.classList.toggle('hidden', !checked);
        }
    }

    bindCheckboxProp(el, key, spot, freeSpaceRow, allowPathsRow)
    {
        el.addEventListener('change', () => {
            spot[key] = el.checked;
            if('isElement' === key){
                this.toggleIsElementRows(freeSpaceRow, allowPathsRow, el.checked);
            }
        });
    }

    initSpotProps(frag, spot)
    {
        let freeSpaceRow = frag.querySelector('.spot-free-space-row');
        let allowPathsRow = frag.querySelector('.spot-allow-paths-row');
        let props = frag.querySelectorAll('[data-prop]');
        for(let el of props){
            let key = el.dataset.prop;
            if('checkbox' === el.type){
                el.checked = spot[key] || false;
                this.bindCheckboxProp(el, key, spot, freeSpaceRow, allowPathsRow);
                continue;
            }
            if(spot[key] !== undefined){
                el.value = spot[key];
            }
            if('number' === el.type){
                el.addEventListener('input', () => {
                    spot[key] = el.value === '' ? null : +el.value;
                });
                continue;
            }
            el.addEventListener('input', () => {
                spot[key] = el.value;
            });
        }
        this.toggleIsElementRows(freeSpaceRow, allowPathsRow, spot.isElement);
    }
}
