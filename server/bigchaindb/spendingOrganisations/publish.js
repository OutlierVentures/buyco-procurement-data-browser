import { Meteor } from 'meteor/meteor';
import { Spending } from '../spending';

const collectionName = "spendingOrganisations";

/**
 * Publish the distinct organisations.
 * For aggregations we use the approach with directly calling the low-level added/changed/removed
 * interface explained here: http://docs.meteor.com/api/pubsub.html#Meteor-publish
 */
Meteor.publish(collectionName, function (options, searchString) {
    let cursor = Spending.aggregate(
        {
            $group: {
                _id: '$organisation_name',
                organisation_name: { $first: '$organisation_name' },
            }
        }).forEach((org) => {
            this.added(collectionName, org.organisation_name, {
                organisation_name: org.organisation_name,
            });
        });

    // Stop observing the cursor when client unsubs.
    // Stopping a subscription automatically takes
    // care of sending the client any removed messages.
    this.onStop(() => {
        if (cursor)
            cursor.stop();
    });

    this.ready();
});
