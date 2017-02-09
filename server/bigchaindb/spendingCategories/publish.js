import { Meteor } from 'meteor/meteor';
import { Spending } from '../spending';
import { publishUniqueValues } from '../utils';

const collectionName = "spendingCategories";

/**
 * Publish the distinct categories.
 * For aggregations we use the approach with directly calling the low-level added/changed/removed
 * interface explained here: http://docs.meteor.com/api/pubsub.html#Meteor-publish
 */
Meteor.publish(collectionName, function (filters) {
    publishUniqueValues(this,
        collectionName,
        Spending,
        filters,
        "procurement_classification_1",
        "name");
});
