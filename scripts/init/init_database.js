// Initialise the database. To be ran through the RethinkDB Data Explorer.
// TODO: include in a server side action.

// Create bigchaindb if it doesn't exist, i.e. if BigchainDB hasn't yet run
// on this RethinkDB cluster
r.dbCreate('bigchain');

// public_spending
r.db('bigchain').tableCreate('public_spending');

// Indexes
r.db('bigchain').table('public_spending').indexCreate('payment_date');
r.db('bigchain').table('public_spending').indexCreate('organisation_name');
r.db('bigchain').table('public_spending').indexCreate('procurement_classification_1');
r.db('bigchain').table('public_spending').indexCreate('sercop_service');


// client_spending
r.db('bigchain').tableCreate('client_spending');

// Indexes
r.db('bigchain').table('client_spending').indexCreate('payment_date');
r.db('bigchain').table('client_spending').indexCreate('organisation_name');
r.db('bigchain').table('client_spending').indexCreate('procurement_classification_1');
r.db('bigchain').table('client_spending').indexCreate('sercop_service');
