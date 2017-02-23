import { Meteor } from 'meteor/meteor';
import { Spending } from '../spending';
import { publishUniqueValues, publishUniqueValuesForOrganisation } from '../utils';

const collectionName = "spendingServices";

/**
 * Publish the distinct services.
 * For aggregations we use the approach with directly calling the low-level added/changed/removed
 * interface explained here: http://docs.meteor.com/api/pubsub.html#Meteor-publish
 */
Meteor.publish(collectionName, function () {
    publishUniqueValuesForOrganisation(this,
        collectionName,
        Spending,
        "organisation_name",
        "sercop_service",
        "name");
});
