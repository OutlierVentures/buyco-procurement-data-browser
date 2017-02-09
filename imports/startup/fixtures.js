import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';

Meteor.startup(() => {

  // Default users
  console.log("Fixtures: populating default users.");
  var defaultUsers = [
    { email: "aron@outlierventures.io", name: "Aron van Ammers", roles: [{ group: Roles.GLOBAL_GROUP, role: 'admin' }] },
    { email: "taimur@buyco.io", name: "Taimur Khan", roles: [{ group: Roles.GLOBAL_GROUP, role: 'admin' }] },
    { email: "jb@outlierventures.io", name: "Jamie Burke", roles: [{ group: Roles.GLOBAL_GROUP, role: 'admin' }] }
  ];

  ensureUserIsInRoles = (userId, defaultUserInfo) => {
    _.each(defaultUserInfo.roles, function (roleInfo) {
      if (!Roles.userIsInRole(userId, roleInfo.role, roleInfo.group)) {
        console.log("Added '" + roleInfo.role + "' role in group '" + roleInfo.group + "' to: '" + defaultUserInfo.email + "'.");
        Roles.addUsersToRoles(userId, roleInfo.role, roleInfo.group);
      }
    });
  }

  _.each(defaultUsers, (defaultUserInfo) => {
    if (Meteor.users.find({ "emails.address": defaultUserInfo.email }).count() == 0) {
      console.log("Creating user '" + defaultUserInfo.email + "'.");
      userId = Accounts.createUser({
        email: defaultUserInfo.email,
        // Start with a unique unguessable password, default users should
        // do a password reset on first use.
        password: Random.secret(40),
        profile: { name: defaultUserInfo.name }
      });

      ensureUserIsInRoles(userId, defaultUserInfo);
    } else {
      console.log("User '" + defaultUserInfo.email + "' already existed.");

      usr = Meteor.users.find({ "emails.address": defaultUserInfo.email }).fetch();

      ensureUserIsInRoles(usr[0]._id, defaultUserInfo);
    }
  });
});
