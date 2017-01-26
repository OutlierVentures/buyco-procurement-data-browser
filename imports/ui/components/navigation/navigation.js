import angular from 'angular';
import angularMeteor from 'angular-meteor';

import template from './navigation.html';

const name = 'navigation';

class NavigationController {
  constructor($scope, $reactive) {
    'ngInject';

    $reactive(this).attach($scope);

    $scope.helpers({
      isLoggedIn: function () {
        return Meteor.userId() != null;

      }
    });
  }
}

// create a module
export default angular.module(name, [
  angularMeteor
]).component(name, {
  template,
  controllerAs: name,
  controller: NavigationController
});
