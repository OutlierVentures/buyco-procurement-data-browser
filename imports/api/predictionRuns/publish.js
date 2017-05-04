import { Meteor } from 'meteor/meteor';

import { PredictionRuns } from './collection';

if (Meteor.isServer) {
    Meteor.publish('prediction_runs', function () {
        let isAllowed = false;

        let selector = {};

        let loggedInUserId = this.userId;
        let loggedInUser = Meteor.users.findOne(loggedInUserId);

        if (Roles.userIsInRole(loggedInUser, ['admin'])) {
            isAllowed = true;
        }

        if (!isAllowed)
            return false;

        Counts.publish(this, 'predictionRunCount', PredictionRuns.find(selector), { noReady: true });

        return PredictionRuns.find(selector);
    });
}
