/**
 *
 * Reldens - SortedRowsRepository
 *
 * Repository stub of sorted rows: loads and counts the rows that match the filters (a value or a GT operator), sorted
 * by the sort column and cut by the offset and limit. With unstable ties the rows with the same sort value come in
 * the opposite id order on the first page, as a database sorting by one column can return them.
 *
 */

const { BaseDriver } = require('@reldens/storage');

class SortedRowsRepository extends BaseDriver
{

    constructor(rows, hasUnstableTies = false)
    {
        super({});
        this.rows = rows;
        this.hasUnstableTies = hasUnstableTies;
        this.loadedQueries = [];
    }

    filterRows(filters = {})
    {
        return this.rows.filter((row) => Object.keys(filters).every((key) => {
            return 'GT' === filters[key]?.operator ? row[key] > filters[key].value : row[key] === filters[key];
        }));
    }

    async count(filters)
    {
        return this.filterRows(filters).length;
    }

    async loadWithRelations(filters)
    {
        this.loadedQueries.push({
            limit: this.limit,
            offset: this.offset,
            sortBy: this.sortBy,
            sortDirection: this.sortDirection
        });
        return this.filterRows(filters).sort((rowA, rowB) => {
            return ('DESC' === this.sortDirection ? -1 : 1) * (rowA[this.sortBy] - rowB[this.sortBy])
                || (this.hasUnstableTies && 0 === this.offset ? -1 : 1) * (rowA.id - rowB.id);
        }).slice(this.offset, 0 < this.limit ? this.offset + this.limit : this.rows.length);
    }

}

module.exports.SortedRowsRepository = SortedRowsRepository;
