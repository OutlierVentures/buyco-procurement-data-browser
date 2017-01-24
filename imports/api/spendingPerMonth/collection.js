// On the client side, RethinkDB tables are mimicked as Mongo collections.
export const SpendingPerMonth = new Mongo.Collection('spendingPerMonth');

SpendingPerMonth.allow({
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
