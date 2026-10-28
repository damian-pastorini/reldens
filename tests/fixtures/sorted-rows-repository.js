/**
 *
 * Reldens - SortedRowsRepository
 *
 */

const { BaseDriver } = require('@reldens/storage');

class SortedRowsRepository extends BaseDriver
{

    constructor(rows)
    {
        super({});
        this.rows = rows;
        this.loadedQueries = [];
    }

    async count()
    {
        return this.rows.length;
    }

    async loadWithRelations()
    {
        this.loadedQueries.push({
            limit: this.limit,
            offset: this.offset,
            sortBy: this.sortBy,
            sortDirection: this.sortDirection
        });
        return [...this.rows].sort((rowA, rowB) => {
            return ('DESC' === this.sortDirection ? -1 : 1) * (rowA[this.sortBy] - rowB[this.sortBy]);
        });
    }

}

module.exports.SortedRowsRepository = SortedRowsRepository;
