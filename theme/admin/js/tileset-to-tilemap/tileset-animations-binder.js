class TilesetAnimationsBinder
{
    constructor(app)
    {
        this.app = app;
        this.pickOptionKey = 'animationTiles';
        this.apply = new TilesetAnimations(this);
        this.framesReorder = new TilesetAnimationFramesReorder(this);
    }

    provideAnimations(tilesetIndex)
    {
        let tileset = this.app.state[tilesetIndex];
        if(!tileset.tileAnimations){
            tileset.tileAnimations = [];
        }
        return tileset.tileAnimations;
    }

    findAnimation(tilesetIndex, animationIndex)
    {
        let animations = this.provideAnimations(tilesetIndex);
        let foundIndex = SharedUtils.toNumber(animationIndex, -1);
        if(!animations[foundIndex]){
            return null;
        }
        return animations[foundIndex];
    }

    isPickActive(tilesetIndex, animationIndex)
    {
        return this.app.tileOptionsBinder.activeTilesetIndex === tilesetIndex
            && this.app.tileOptionsBinder.activeAnimationIndex === animationIndex;
    }

    findActiveAnimation(tilesetIndex)
    {
        let pickBinder = this.app.tileOptionsBinder;
        if(pickBinder.activeTilesetIndex !== tilesetIndex){
            return null;
        }
        if(null === pickBinder.activeAnimationIndex){
            return null;
        }
        return this.findAnimation(tilesetIndex, pickBinder.activeAnimationIndex);
    }

    bindTileset(tilesetIndex, rowEl)
    {
        let panel = rowEl.querySelector('.tileset-animations-panel');
        let toggleBtn = rowEl.querySelector('.tileset-animations-toggle');
        if(!panel){
            return;
        }
        if(!toggleBtn){
            return;
        }
        toggleBtn.addEventListener('click', () => this.togglePanel(tilesetIndex, rowEl, panel));
        panel.querySelector('.tileset-animation-add').addEventListener('click', () => {
            this.addAnimation(tilesetIndex);
        });
        let defaultDurationInput = panel.querySelector('.tileset-animations-default-duration');
        defaultDurationInput.addEventListener('input', () => {
            this.app.state[tilesetIndex].animationsDefaultDuration = TilesetAnimationsNormalizer
                .normalizeDuration(defaultDurationInput.value);
        });
        let skipInput = panel.querySelector('.tileset-animations-skip');
        skipInput.addEventListener('change', () => {
            this.app.state[tilesetIndex].skipTileAnimations = skipInput.checked;
        });
        let list = panel.querySelector('.tileset-animations-list');
        list.addEventListener('click', (clickEvent) => this.handleListClick(tilesetIndex, clickEvent));
        list.addEventListener('input', (inputEvent) => this.handleListInput(tilesetIndex, inputEvent));
        this.framesReorder.bindList(tilesetIndex, list);
        this.apply.applyToRow(tilesetIndex, rowEl);
    }

    togglePanel(tilesetIndex, rowEl, panel)
    {
        let isClosing = !panel.classList.contains('hidden');
        panel.classList.toggle('hidden');
        rowEl.querySelector('.tileset-map-config-fieldset').classList.add('hidden');
        rowEl.querySelector('.tileset-merge-config').classList.add('hidden');
        if(isClosing){
            this.deactivatePick();
        }
        this.app.renderer.renderCanvas(tilesetIndex);
    }

    refreshPanel(tilesetIndex)
    {
        let rowEl = this.app.tileOptionsBinder.getTilesetRowEl(tilesetIndex);
        if(rowEl){
            this.apply.applyToRow(tilesetIndex, rowEl);
        }
        this.app.renderer.renderCanvas(tilesetIndex);
    }

    activatePick(tilesetIndex, animationIndex)
    {
        let pickBinder = this.app.tileOptionsBinder;
        pickBinder.deactivate();
        pickBinder.activateOption(tilesetIndex, this.pickOptionKey, true, null);
        pickBinder.activeAnimationIndex = animationIndex;
        this.refreshPanel(tilesetIndex);
        this.scrollToAnimation(tilesetIndex, animationIndex);
    }

    scrollToAnimation(tilesetIndex, animationIndex)
    {
        let rowEl = this.app.tileOptionsBinder.getTilesetRowEl(tilesetIndex);
        if(!rowEl){
            return;
        }
        let list = rowEl.querySelector('.tileset-animations-list');
        if(!list){
            return;
        }
        this.app.editor.scroller.scrollIntoView(
            list,
            list.querySelector('.tileset-animation-row[data-animation-index="'+animationIndex+'"]')
        );
    }

    deactivatePick()
    {
        let pickBinder = this.app.tileOptionsBinder;
        if(null === pickBinder.activeAnimationIndex){
            return;
        }
        pickBinder.deactivate();
    }

    togglePick(tilesetIndex, animationIndex)
    {
        if(this.isPickActive(tilesetIndex, animationIndex)){
            this.deactivatePick();
            this.refreshPanel(tilesetIndex);
            return;
        }
        this.activatePick(tilesetIndex, animationIndex);
    }

    addAnimation(tilesetIndex)
    {
        let animations = this.provideAnimations(tilesetIndex);
        let animationName = 'animation-'+SharedUtils.padNum(animations.length + 1);
        animations.push(TilesetAnimationsNormalizer.buildDefaultAnimation(animationName));
        this.activatePick(tilesetIndex, animations.length - 1);
    }

    requestRemoveAnimation(tilesetIndex, animationIndex)
    {
        let animation = this.findAnimation(tilesetIndex, animationIndex);
        if(!animation){
            return;
        }
        this.app.modals.show(
            'Delete animation "'+animation.name+'"?',
            () => this.removeAnimation(tilesetIndex, animationIndex)
        );
    }

    removeAnimation(tilesetIndex, animationIndex)
    {
        this.deactivatePick();
        this.provideAnimations(tilesetIndex).splice(SharedUtils.toNumber(animationIndex, 0), 1);
        this.refreshPanel(tilesetIndex);
    }

    removeFrame(tilesetIndex, animationIndex, frameIndex)
    {
        let animation = this.findAnimation(tilesetIndex, animationIndex);
        if(!animation){
            return;
        }
        if(!animation.frames){
            return;
        }
        animation.frames.splice(SharedUtils.toNumber(frameIndex, 0), 1);
        this.refreshPanel(tilesetIndex);
    }

    applyDurationToFrames(tilesetIndex, animationIndex)
    {
        let animation = this.findAnimation(tilesetIndex, animationIndex);
        if(!animation){
            return;
        }
        let duration = TilesetAnimationsNormalizer.normalizeDuration(animation.defaultDuration);
        if(null === duration){
            duration = TilesetAnimationsNormalizer.resolveDefaultDuration(this.app.state[tilesetIndex]);
        }
        this.writeFramesDuration(animation.frames, duration);
        this.refreshPanel(tilesetIndex);
    }

    writeFramesDuration(frames, duration)
    {
        for(let frame of (frames ? frames : [])){
            frame.duration = duration;
        }
    }

    handleTilePick(tilesetIndex, tileRow, tileCol, isRightClick)
    {
        let animation = this.findActiveAnimation(tilesetIndex);
        if(!animation){
            return;
        }
        let flatIndex = this.app.interaction.flatIndexFor(tilesetIndex, {row: tileRow, col: tileCol});
        if(isRightClick){
            this.removePickedTile(animation, flatIndex);
            this.refreshPanel(tilesetIndex);
            return;
        }
        this.appendPickedTile(animation, flatIndex);
        this.refreshPanel(tilesetIndex);
    }

    removePickedTile(animation, flatIndex)
    {
        let frames = animation.frames ? animation.frames : [];
        for(let frameIndex = frames.length - 1; 0 <= frameIndex; frameIndex--){
            if(flatIndex === frames[frameIndex].tile){
                frames.splice(frameIndex, 1);
                break;
            }
        }
        this.resolveBaseTile(animation, frames);
    }

    resolveBaseTile(animation, frames)
    {
        for(let frame of frames){
            if(animation.baseTile === frame.tile){
                return;
            }
        }
        animation.baseTile = 0 < frames.length ? frames[0].tile : null;
    }

    appendPickedTile(animation, flatIndex)
    {
        if(null === animation.baseTile){
            animation.baseTile = flatIndex;
            animation.frames = [{tile: flatIndex, duration: null}];
            return;
        }
        if(!animation.frames){
            animation.frames = [];
        }
        animation.frames.push({tile: flatIndex, duration: null});
    }

    handleListClick(tilesetIndex, clickEvent)
    {
        let animationRow = clickEvent.target.closest('.tileset-animation-row');
        if(!animationRow){
            return;
        }
        let animationIndex = SharedUtils.toNumber(animationRow.dataset.animationIndex, 0);
        let frameRemoveBtn = clickEvent.target.closest('.tileset-animation-frame-remove');
        if(frameRemoveBtn){
            this.removeFrame(tilesetIndex, animationIndex, frameRemoveBtn.dataset.frameIndex);
            return;
        }
        if(clickEvent.target.closest('.tileset-animation-delete')){
            this.requestRemoveAnimation(tilesetIndex, animationIndex);
            return;
        }
        if(clickEvent.target.closest('.tileset-animation-apply-duration')){
            this.applyDurationToFrames(tilesetIndex, animationIndex);
            return;
        }
        if(clickEvent.target.closest('.tileset-animation-pick-btn')){
            this.togglePick(tilesetIndex, animationIndex);
        }
    }

    handleListInput(tilesetIndex, inputEvent)
    {
        let animationRow = inputEvent.target.closest('.tileset-animation-row');
        if(!animationRow){
            return;
        }
        let animation = this.findAnimation(tilesetIndex, animationRow.dataset.animationIndex);
        if(!animation){
            return;
        }
        if(inputEvent.target.matches('.tileset-animation-name')){
            animation.name = inputEvent.target.value;
            return;
        }
        if(inputEvent.target.matches('.tileset-animation-duration')){
            animation.defaultDuration = TilesetAnimationsNormalizer.normalizeDuration(inputEvent.target.value);
            return;
        }
        if(inputEvent.target.matches('.tileset-animation-frame-duration')){
            this.updateFrameDuration(animation, inputEvent.target);
        }
    }

    updateFrameDuration(animation, durationInput)
    {
        let frameCell = durationInput.closest('.tileset-animation-frame');
        let frame = animation.frames[SharedUtils.toNumber(frameCell.dataset.frameIndex, 0)];
        if(!frame){
            return;
        }
        frame.duration = TilesetAnimationsNormalizer.normalizeDuration(durationInput.value);
    }
}
window.TilesetAnimationsBinder = TilesetAnimationsBinder;
