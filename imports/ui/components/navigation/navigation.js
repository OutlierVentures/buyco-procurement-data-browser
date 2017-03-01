import angular from 'angular';
import angularMeteor from 'angular-meteor';
import angularUiBootstrap from 'angular-ui-bootstrap';

import template from './navigation.html';

const name = 'navigation';

class NavigationController {
  constructor($scope, $reactive, $rootScope) {
    'ngInject';

    $reactive(this).attach($scope);

    $scope.requestResize = () => {
      // Inform other components that the page / main container has been resized, so any
      // redrawing that's not automatic should be done now.
      $rootScope.$emit('resizeRequested');
    }

    $scope.helpers({
      isLoggedIn: function () {
        return Meteor.userId() != null;
      },
    });
  }
}

// create a module
export default angular.module(name, [
  angularMeteor,
  angularUiBootstrap
]).component(name, {
  template,
  controllerAs: name,
  controller: NavigationController
});

