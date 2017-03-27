import angular from 'angular';

import { Meteor } from 'meteor/meteor';

import { name as ProcurementDataBrowser } from '../imports/ui/components/procurementDataBrowser/procurementDataBrowser';

function onReady() {
  angular.bootstrap(document, [
    ProcurementDataBrowser
  ], {
    strictDi: true
  });
}

if (Meteor.isCordova) {
  angular.element(document).on('deviceready', onReady);
} else {
  angular.element(document).ready(onReady);
}


/**
 * Load Google Analytics tracker.
 */
Meteor.startup(function(){
  // To disable Google analytics, uncomment the line below.
  // TODO: use Meteor.settings to enable/disable.
  // return;

  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

  // UA-76730152-2 - PDW staging app
  ga('create', 'UA-76730152-2', 'auto');
  ga('send', 'pageview');

});


/**
 * Load Hotjar tracker.
 */
Meteor.startup(function(){
  (function(h,o,t,j,a,r){
        h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
        h._hjSettings={hjid:457085,hjsv:5};
        a=o.getElementsByTagName('head')[0];
        r=o.createElement('script');r.async=1;
        r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
        a.appendChild(r);
    })(window,document,'//static.hotjar.com/c/hotjar-','.js?sv=');
});