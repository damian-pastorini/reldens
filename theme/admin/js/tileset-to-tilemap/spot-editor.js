/* exported TilesetSpotEditor */
class TilesetSpotEditor
{
    constructor(editor)
    {
        this.editor = editor;
    }

    appendSpotRow(list, spot, si, tileset, tilesetIndex, spotTemplate)
    {
        let frag = spotTemplate.content.cloneNode(true);
        let spotRow = frag.querySelector('.spot-row');
        spotRow.dataset.spotName = spot.name;
        spotRow.dataset.spotIndex = si;
        let nameInput = frag.querySelector('.spot-name-input');
        nameInput.value = spot.name || '';
        let detail = frag.querySelector('.spot-detail');
        if(this.editor.app.selectedSpot
            && this.editor.app.selectedSpot.tilesetIndex === tilesetIndex
            && this.editor.app.selectedSpot.spotIndex === si){
            detail.classList.remove('hidden');
        }
        this.applySpotLockState(frag, spot);
        this.applySpotBulkState(frag, spot);
        this.initSpotProps(frag, spot);
        list.appendChild(frag);
    }

    applySpotLockState(frag, spot)
    {
        let lockBtn = frag.querySelector('.spot-lock-btn');
        if(!lockBtn || !spot.approved){
            return;
        }
        lockBtn.classList.add('locked');
        let lockIcon = lockBtn.querySelector('.lock-icon');
        if(lockIcon){
            lockIcon.src = '/assets/admin/lock-solid.svg';
        }
    }

    applySpotBulkState(frag, spot)
    {
        let bulkCheckbox = frag.querySelector('.spot-bulk-select');
        if(!bulkCheckbox){
            return;
        }
        bulkCheckbox.checked = spot.bulkSelected || false;
    }

    toggleIsElementRows(spotRow, checked)
    {
        let freeSpaceRow = spotRow.querySelector('.spot-free-space-row');
        let allowPathsRow = spotRow.querySelector('.spot-allow-paths-row');
        if(freeSpaceRow){
            freeSpaceRow.classList.toggle('hidden', !checked);
        }
        if(allowPathsRow){
            allowPathsRow.classList.toggle('hidden', !checked);
        }
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
        let props = frag.querySelectorAll('[data-prop]');
        for(let propInput of props){
            let key = propInput.dataset.prop;
            if('checkbox' === propInput.type){
                propInput.checked = spot[key] || false;
                continue;
            }
            if('number' === propInput.type){
                this.initNumberSpotProp(propInput, key, spot);
                continue;
            }
            if(undefined !== spot[key]){
                propInput.value = spot[key];
            }
            if('depth' === key && undefined === spot[key]){
                propInput.value = 'false';
                spot[key] = false;
            }
        }
        let spotRow = frag.querySelector('.spot-row');
        this.toggleIsElementRows(spotRow, spot.isElement);
    }
}
window.TilesetSpotEditor = TilesetSpotEditor;
