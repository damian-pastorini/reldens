(function(){
    let importLoadingImg = document.querySelector('.maps-import-form .loading');
    let generatingOverlay = document.querySelector('.maps-wizard-generating-overlay');
    if(!importLoadingImg || !generatingOverlay){
        return;
    }
    let observer = new MutationObserver(function(){
        if(!importLoadingImg.classList.contains('hidden')){
            generatingOverlay.classList.remove('hidden');
        }
    });
    observer.observe(importLoadingImg, {attributes: true, attributeFilter: ['class']});
})();
