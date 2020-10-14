/**
 *
 * Reldens - StatsModel
 *
 * Players stats storage model, this class will load, add, edit, delete the values in the storage.
 *
 * We have 3 stats related models:
 *
 * - This one is the PlayerStatsModel which holds the stats main data: key, label, description and base value (the
 * minimum value for this stat).
 * - Then we have the PlayersStatsModel which holds the base stat value for each player and this value is used as
 *  the "reset" or "maximum" value for the stat. For example, you have a player lvl-1 which for start took the
 *  PlayerStatsModel.base_value (100) > then the player level up lvl-2 and win a modifier of +100 HP, here is when the
 *  PlayersStatsBaseModel.value takes place and the 200 HP is saved. As you can see this doesn't has anything to do
 *  with the current player HP points.
 *  - For last you have the PlayersStatsCurrentModel.value where following the previous example if the player received
 *  damage (let's say -10 HP) it would be saved here: PlayersStatsCurrentModel.value = 190 HP. At the same time if the
 *  player die, then the PlayersStatsCurrentModel.value could be reset to the PlayersStatsBaseModel.value which will be
 *  the player maximum HP at that level (lvl-2, 200 HP).
 *  These gives a lot of flexibility in terms of having a stat initial value, increase that base value over time, and
 *  have a different value for the current time.
 *  Note, the example is for a very specific case that could be replicated in something like MP as well, but then and
 *  for a more general example let's say ATK, that will almost always have the value in the Base or in the Current
 *  unless you create a skill that will temporally decrease the player ATK.
 *
 *  UPDATE: PlayersStatsBaseModel and PlayersStatsCurrentModel were merged into PlayersStatsModel which holds both
 *  base and current values. The first PlayersStatsModel, which originally contained the stats data, is now StatsModel.
 *
 */

const { ModelClass } = require('@reldens/storage');

class StatsModel extends ModelClass
{

    static get tableName()
    {
        return 'stats';
    }

}

module.exports.StatsModel = StatsModel;
