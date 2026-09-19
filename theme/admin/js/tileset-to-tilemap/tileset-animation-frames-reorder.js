class TilesetAnimationFramesReorder
{
    constructor(binder)
    {
        this.binder = binder;
        this.draggedAnimationIndex = null;
        this.draggedFrameIndex = null;
    }

    bindList(tilesetIndex, list)
    {
        list.addEventListener('dragstart', (dragEvent) => this.startDrag(dragEvent));
        list.addEventListener('dragover', (dragEvent) => this.allowDrop(dragEvent));
        list.addEventListener('drop', (dragEvent) => this.applyDrop(tilesetIndex, dragEvent));
        list.addEventListener('dragend', () => this.clearDragState());
    }

    fetchFramePosition(eventTarget)
    {
        let frameCell = eventTarget.closest('.tileset-animation-frame');
        if(!frameCell){
            return null;
        }
        let animationRow = frameCell.closest('.tileset-animation-row');
        if(!animationRow){
            return null;
        }
        return {
            animationIndex: SharedUtils.toNumber(animationRow.dataset.animationIndex, 0),
            frameIndex: SharedUtils.toNumber(frameCell.dataset.frameIndex, 0),
            frameCell
        };
    }

    startDrag(dragEvent)
    {
        let position = this.fetchFramePosition(dragEvent.target);
        if(!position){
            return;
        }
        this.draggedAnimationIndex = position.animationIndex;
        this.draggedFrameIndex = position.frameIndex;
        dragEvent.dataTransfer.effectAllowed = 'move';
        dragEvent.dataTransfer.setData('text/plain', String(position.frameIndex));
        position.frameCell.classList.add('dragging');
    }

    fetchDropPosition(dragEvent)
    {
        if(null === this.draggedFrameIndex){
            return null;
        }
        let position = this.fetchFramePosition(dragEvent.target);
        if(!position){
            return null;
        }
        if(position.animationIndex !== this.draggedAnimationIndex){
            return null;
        }
        return position;
    }

    allowDrop(dragEvent)
    {
        let position = this.fetchDropPosition(dragEvent);
        if(!position){
            return;
        }
        dragEvent.preventDefault();
        dragEvent.dataTransfer.dropEffect = 'move';
    }

    applyDrop(tilesetIndex, dragEvent)
    {
        let position = this.fetchDropPosition(dragEvent);
        if(!position){
            return;
        }
        dragEvent.preventDefault();
        this.moveFrame(tilesetIndex, position.animationIndex, position.frameIndex);
    }

    moveFrame(tilesetIndex, animationIndex, targetFrameIndex)
    {
        let animation = this.binder.findAnimation(tilesetIndex, animationIndex);
        if(!animation || !animation.frames){
            return;
        }
        if(this.draggedFrameIndex === targetFrameIndex){
            this.clearDragState();
            return;
        }
        let movedFrames = animation.frames.splice(this.draggedFrameIndex, 1);
        animation.frames.splice(targetFrameIndex, 0, movedFrames[0]);
        animation.baseTile = animation.frames[0].tile;
        this.clearDragState();
        this.binder.refreshPanel(tilesetIndex);
    }

    clearDragState()
    {
        this.draggedAnimationIndex = null;
        this.draggedFrameIndex = null;
        let draggingCells = document.querySelectorAll('.tileset-animation-frame.dragging');
        for(let frameCell of draggingCells){
            frameCell.classList.remove('dragging');
        }
    }
}
window.TilesetAnimationFramesReorder = TilesetAnimationFramesReorder;
