/**
 *
 * Reldens - PageRangeProvider
 *
 */

class PageRangeProvider
{

    fetch(page, totalPages, totalDisplayedPages = 5, firstLabel = 'first', lastLabel = 'last')
    {
        let half = Math.floor(totalDisplayedPages / 2);
        let start = page - half;
        let end = page + half;
        start = Math.max(1, start);
        end = Math.min(totalPages, end);
        if(end - start + 1 < totalDisplayedPages){
            if(start === 1){
                end = Math.min(totalPages, start + totalDisplayedPages - 1);
            }
            start = Math.max(1, end - totalDisplayedPages + 1);
        }
        let range = [];
        if(1 < start){
            range.push({label: firstLabel, value: 1});
        }
        for(let i = start; i <= end; i++){
            range.push({label: i, value: i});
        }
        if(end < totalPages){
            range.push({label: lastLabel, value: totalPages - 1});
        }
        return range;
    }

}

module.exports.PageRangeProvider = new PageRangeProvider();
