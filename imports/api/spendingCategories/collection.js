// On the client side, RethinkDB tables are mimicked as Mongo collections.
export const SpendingCategories = new Mongo.Collection('spendingCategories');

SpendingCategories.allow({
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
