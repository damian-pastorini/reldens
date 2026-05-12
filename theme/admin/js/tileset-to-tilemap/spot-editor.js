/* exported TilesetSpotEditor */
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
        spotHeader.addEventListener('click', (mouseEvent) => {
            if(mouseEvent.target === nameInput){
                return;
            }
            if(lockBtn && (mouseEvent.target === lockBtn || lockBtn.contains(mouseEvent.target))){
                return;
            }
            if(mouseEvent.target === deleteBtn || deleteBtn.contains(mouseEvent.target)){
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
            this.editor.app.modals.show(
                'Delete "'+spotName+'"?',
                () => {
                    if(this.editor.app.tileOptionsBinder
                        && this.editor.app.tileOptionsBinder.activeSpotName === spotName){
                        this.editor.app.tileOptionsBinder.deactivate();
                    }
                    tileset.spots.splice(capturedSi, 1);
                    this.editor.renderLegend(tilesetIndex);
                }
            );
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
        bulkCheckbox.addEventListener('click', (event) => event.stopPropagation());
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
        lockBtn.addEventListener('click', (mouseEvent) => {
            mouseEvent.stopPropagation();
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

    bindCheckboxProp(domElement, key, spot, freeSpaceRow, allowPathsRow)
    {
        domElement.addEventListener('change', () => {
            spot[key] = domElement.checked;
            if('isElement' === key){
                this.toggleIsElementRows(freeSpaceRow, allowPathsRow, domElement.checked);
            }
        });
    }

    initNumberSpotProp(domElement, key, spot)
    {
        if(null !== spot[key] && undefined !== spot[key]){
            domElement.value = spot[key];
            return;
        }
        let minVal = '' !== domElement.min ? +domElement.min : 0;
        if(0 < minVal){
            spot[key] = minVal;
            domElement.value = minVal;
        }
    }

    initSpotProps(frag, spot)
    {
        let freeSpaceRow = frag.querySelector('.spot-free-space-row');
        let allowPathsRow = frag.querySelector('.spot-allow-paths-row');
        let props = frag.querySelectorAll('[data-prop]');
        for(let propInput of props){
            let key = propInput.dataset.prop;
            if('checkbox' === propInput.type){
                propInput.checked = spot[key] || false;
                this.bindCheckboxProp(propInput, key, spot, freeSpaceRow, allowPathsRow);
                continue;
            }
            if('number' === propInput.type){
                this.initNumberSpotProp(propInput, key, spot);
                propInput.addEventListener('input', () => {
                    spot[key] = '' === propInput.value ? null : +propInput.value;
                });
                continue;
            }
            if(undefined !== spot[key]){
                propInput.value = spot[key];
            }
            if('depth' === key && undefined === spot[key]){
                propInput.value = 'false';
                spot[key] = false;
            }
            propInput.addEventListener('input', () => {
                if('depth' === key){
                    let v = propInput.value;
                    spot[key] = ('' === v || 'false' === v) ? false : ('true' === v ? true : v);
                    return;
                }
                spot[key] = propInput.value;
            });
        }
        this.toggleIsElementRows(freeSpaceRow, allowPathsRow, spot.isElement);
    }
}
