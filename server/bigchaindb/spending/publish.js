import { Meteor } from 'meteor/meteor';
import { Config } from '../config';

let database = new MongoInternals.RemoteCollectionDriver(Config.bigchainDb.database.url);

export const Spending = new Mongo.Collection('public_spending', { _driver: database });

console.log("spending publish.js");

const collectionName = "public_spending";

Meteor.publish(collectionName, function (options, searchString) {

    let selector = {};
    let queryOptions = {};

    queryOptions.sort = { '_id': 1 };

    // Apply pagination parameters.
    // The options collection looks like this:
    // {
    // 	"sort": {
    // 		"name_sort": 1
    // 	},
    // 	"limit": 3,
    // 	"skip": 0
    // }
    queryOptions.skip = options.skip;
    queryOptions.limit = options.limit;

    // Filter by search string

    if (typeof searchString === 'string' && searchString.length) {
        let searchRegex = {
            $regex: `.*${searchString}.*`,
            $options: 'i'
        };

        selector.$or = [
            { organisation_name: searchRegex },
            { procurement_classification_1: searchRegex },
            { purpose: searchRegex }
        ];
    }
    
    // TODO: publish counts. The package tmeasday:counts is only usable for counts in the order of 100.
    // The official way is documented here and should work well: http://docs.meteor.com/api/pubsub.html#Meteor-publish

    // Counts.publish(this, 'spendingTransactionsCount', Spending.find(selector), { noReady: true });
    return Spending.find(selector, queryOptions);
});
