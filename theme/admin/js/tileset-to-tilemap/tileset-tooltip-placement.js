class TilesetTooltipPlacement
{
    constructor(app)
    {
        this.app = app;
        this.bound = false;
        this.gap = 4;
    }

    bindOnce()
    {
        if(this.bound){
            return;
        }
        let analyzer = this.app.getElement('.tileset-analyzer');
        if(!analyzer){
            return;
        }
        this.bound = true;
        analyzer.addEventListener('mouseover', (event) => this.dispatch(event, true));
        analyzer.addEventListener('mouseout', (event) => this.dispatch(event, false));
    }

    dispatch(event, isEntering)
    {
        let tooltip = event.target.closest('.tooltip');
        if(!tooltip){
            return;
        }
        let tooltipText = tooltip.querySelector('.tooltip-text');
        if(!tooltipText){
            return;
        }
        if(isEntering){
            this.applyPlacement(tooltip, tooltipText);
            return;
        }
        let related = event.relatedTarget;
        if(related && tooltip.contains(related)){
            return;
        }
        this.clearPlacement(tooltipText);
    }

    measureTooltipSize(tooltipText)
    {
        if(!this.sizeCache){
            this.sizeCache = new WeakMap();
        }
        let cached = this.sizeCache.get(tooltipText);
        if(cached){
            return cached;
        }
        let size = { width: tooltipText.offsetWidth, height: tooltipText.offsetHeight };
        this.sizeCache.set(tooltipText, size);
        return size;
    }

    applyPlacement(tooltip, tooltipText)
    {
        let triggerRect = tooltip.getBoundingClientRect();
        let size = this.measureTooltipSize(tooltipText);
        let textWidth = size.width;
        let textHeight = size.height;
        let top = triggerRect.top - textHeight - this.gap;
        if(top < 0){
            top = triggerRect.bottom + this.gap;
        }
        if(top + textHeight > window.innerHeight){
            top = window.innerHeight - textHeight;
        }
        if(top < 0){
            top = 0;
        }
        let left = triggerRect.left;
        if(left + textWidth > window.innerWidth){
            left = triggerRect.right - textWidth;
        }
        if(left < 0){
            left = 0;
        }
        tooltipText.style.position = 'fixed';
        tooltipText.style.top = top+'px';
        tooltipText.style.left = left+'px';
        tooltipText.style.right = 'auto';
        tooltipText.style.bottom = 'auto';
    }

    clearPlacement(tooltipText)
    {
        tooltipText.style.position = '';
        tooltipText.style.top = '';
        tooltipText.style.left = '';
        tooltipText.style.right = '';
        tooltipText.style.bottom = '';
    }
}
window.TilesetTooltipPlacement = TilesetTooltipPlacement;
