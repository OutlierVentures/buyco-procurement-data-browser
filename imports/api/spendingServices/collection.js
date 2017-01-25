// On the client side, RethinkDB tables are mimicked as Mongo collections.
export const SpendingServices = new Mongo.Collection('spendingServices');

SpendingServices.allow({
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
