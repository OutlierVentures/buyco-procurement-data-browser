import { Meteor } from 'meteor/meteor';

import { Clients } from './collection';

if (Meteor.isServer) {
    Meteor.publish('clients', function () {
        // Admins have access to all clients.

        if (Roles.userIsInRole(this.userId, ["admin"])) {
            console.log("User is global admin, returning all clients");
            return Clients.find({});
        } else {
            // Get all groups that user has access to
            console.log("Checking groups for user");
            var groups = Roles.getGroupsForUser(this.userId, ["viewer", "admin"]);

            const selector = {
                $or: []
            };

            _(groups).each((g) => {
                selector.$or.push({ "client_id": g });
            });

            if (selector.$or.length == 0)
                return;

            return Clients.find(selector);
        }

        return this.ready();
    });
}