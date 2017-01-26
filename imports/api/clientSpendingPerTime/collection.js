// On the client side, RethinkDB tables are mimicked as Mongo collections.
export const ClientSpendingPerTime = new Mongo.Collection('clientSpendingPerTime');

ClientSpendingPerTime.allow({
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
