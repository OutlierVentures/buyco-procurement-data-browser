// On the client side, RethinkDB tables are mimicked as Mongo collections.
export const SpendingPerTime = new Mongo.Collection('spendingPerTime');

SpendingPerTime.allow({
  insert: function (userId, transaction) {
    return false;
  },
  update: function (userId, transaction, fields, modifier) {
    return false;
  },
  remove: function (userId, transaction) {
    return false;
  }
});
