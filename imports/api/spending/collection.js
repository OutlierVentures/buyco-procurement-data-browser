// On the client side, RethinkDB tables are mimicked as Mongo collections.
export const Spending = new Mongo.Collection('spending');

Spending.allow({
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
