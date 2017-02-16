import { Meteor } from 'meteor/meteor';
import { Config } from '../config';

// Client spending data is stored in the normal Meteor MongoDB, not in the public ledger.
export const ClientSpending = new Mongo.Collection('client_spending');

const collectionName = "client_spending";

// client_spending is not published individually yet. Can activate if added value.
// Meteor.publish(collectionName, function (filters, options, searchString) {

//     let selector = {};
//     let queryOptions = {};

//     if (!filters.client_id)
//         return;

//     // Only users with viewer/admin role for this org are allowed to access.
//     if (!(Roles.userIsInRole(this.userId, 'viewer', filters.client_id)
//         || Roles.userIsInRole(this.userId, 'admin', filters.client_id)))
//         throw new Meteor.Error(403);

//     queryOptions.sort = { '_id': 1 };

//     // Apply pagination parameters.
//     // The options collection looks like this:
//     // {
//     // 	"sort": {
//     // 		"name_sort": 1
//     // 	},
//     // 	"limit": 3,
//     // 	"skip": 0
//     // }
//     queryOptions.skip = options.skip;
//     queryOptions.limit = options.limit;

//     // Filter by search string

//     if (typeof searchString === 'string' && searchString.length) {
//         let searchRegex = {
//             $regex: `.*${searchString}.*`,
//             $options: 'i'
//         };

//         selector.$or = [
//             { organisation_name: searchRegex },
//             { procurement_classification_1: searchRegex },
//             { purpose: searchRegex }
//         ];
//     }
    
//     // TODO: publish counts. The package tmeasday:counts is only usable for counts in the order of 100.
//     // The official way is documented here and should work well: http://docs.meteor.com/api/pubsub.html#Meteor-publish

//     // Counts.publish(this, 'spendingTransactionsCount', Spending.find(selector), { noReady: true });
//     return Spending.find(selector, queryOptions);
// });
