class TilesetAnimations
{
    constructor(binder)
    {
        this.binder = binder;
    }

    applyToRow(tilesetIndex, rowEl)
    {
        let panel = rowEl.querySelector('.tileset-animations-panel');
        if(!panel){
            return;
        }
        let tileset = this.binder.app.state[tilesetIndex];
        let defaultDurationInput = panel.querySelector('.tileset-animations-default-duration');
        defaultDurationInput.value = TilesetAnimationsNormalizer.resolveDefaultDuration(tileset);
        panel.querySelector('.tileset-animations-skip').checked = true === tileset.skipTileAnimations;
        this.renderList(panel, tilesetIndex, this.binder.provideAnimations(tilesetIndex));
        this.applyPickBanner(tilesetIndex, panel);
    }

    renderList(panel, tilesetIndex, animations)
    {
        let list = panel.querySelector('.tileset-animations-list');
        list.textContent = '';
        let template = this.binder.app.getElement('.tileset-animation-row-template');
        for(let i = 0; i < animations.length; i++){
            list.appendChild(this.buildAnimationRow(template, animations[i], i, tilesetIndex));
        }
        panel.querySelector('.tileset-animations-empty').classList.toggle('hidden', 0 !== animations.length);
    }

    buildAnimationRow(template, animation, animationIndex, tilesetIndex)
    {
        let frag = template.content.cloneNode(true);
        frag.querySelector('.tileset-animation-row').dataset.animationIndex = animationIndex;
        frag.querySelector('.tileset-animation-name').value = animation.name || '';
        frag.querySelector('.tileset-animation-base-tile').textContent = this.formatTile(animation.baseTile);
        let durationInput = frag.querySelector('.tileset-animation-duration');
        durationInput.value = SharedUtils.isSet(animation.defaultDuration) ? animation.defaultDuration : '';
        let pickBtn = frag.querySelector('.tileset-animation-pick-btn');
        pickBtn.textContent = null === animation.baseTile ? 'Pick base tile' : 'Add frames';
        pickBtn.classList.toggle('active', this.binder.isPickActive(tilesetIndex, animationIndex));
        this.renderFrames(frag.querySelector('.tileset-animation-frames'), animation.frames || []);
        return frag;
    }

    renderFrames(framesContainer, frames)
    {
        let template = this.binder.app.getElement('.tileset-animation-frame-template');
        for(let i = 0; i < frames.length; i++){
            framesContainer.appendChild(this.buildFrameCell(template, frames[i], i));
        }
    }

    buildFrameCell(template, frame, frameIndex)
    {
        let frag = template.content.cloneNode(true);
        frag.querySelector('.tileset-animation-frame').dataset.frameIndex = frameIndex;
        frag.querySelector('.tileset-animation-frame-tile').textContent = this.formatTile(frame.tile);
        let durationInput = frag.querySelector('.tileset-animation-frame-duration');
        durationInput.value = SharedUtils.isSet(frame.duration) ? frame.duration : '';
        frag.querySelector('.tileset-animation-frame-remove').dataset.frameIndex = frameIndex;
        return frag;
    }

    formatTile(tileId)
    {
        if(!SharedUtils.isSet(tileId)){
            return '-';
        }
        return '#'+tileId;
    }

    applyPickBanner(tilesetIndex, panel)
    {
        let statusEl = panel.querySelector('.tileset-animation-pick-status');
        let animation = this.binder.findActiveAnimation(tilesetIndex);
        if(!animation){
            statusEl.classList.add('hidden');
            return;
        }
        statusEl.querySelector('.tile-pick-label').textContent = this.buildPickLabel(animation);
        statusEl.classList.remove('hidden');
    }

    buildPickLabel(animation)
    {
        if(null === animation.baseTile){
            return 'Click the base tile on the canvas for "'+animation.name+'"';
        }
        return 'Click canvas tiles to append frames to "'+animation.name+'"';
    }
}
window.TilesetAnimations = TilesetAnimations;
