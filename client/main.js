import angular from 'angular';

import { Meteor } from 'meteor/meteor';

import { name as ProcurementDataBrowser } from '/imports/ui/components/procurementDataBrowser/procurementDataBrowser';
import { name as PredictionManager } from '/imports/ui/components/admin/predictionManager/predictionManager';

function onReady() {
  angular.bootstrap(document, [
    ProcurementDataBrowser,
    PredictionManager
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
 * Menu initialisation code
 */
Meteor.startup(function () {
  $(document).ready(function () {

    //***** Side Menu *****//
    $(".side-menus li.menu-item-has-children > a").on("click", function () {
      $(this).parent().siblings().children("ul").slideUp();
      $(this).parent().siblings().removeClass("active");
      $(this).parent().children("ul").slideToggle();
      $(this).parent().toggleClass("active");
      return false;
    });

    //***** Side Menu Option *****//
    $('.menu-options').on("click", function () {
      $(".side-header.opened-menu").toggleClass('slide-menu');
      $(".main-content").toggleClass('wide-content');
      $("footer").toggleClass('wide-footer');
      $(".menu-options").toggleClass('active');

      // The menu collapse/expand resizes the main container. We need to inform
      // components that they should do any resize operations.

      let requestResize = () => {
        // Call angular functions from outside the controller
        angular.element('#menu-options').scope().requestResize();
        angular.element('#menu-options').scope().$apply();
      };

      // The menu resize uses an animation. The event should only be emitted when the animation
      // has finished and the components have taken their final size. Use setTimeout as a workaround.

      // TODO: properly detect when the menu animation has finished, don't rely on an arbitrary
      // timeout.
      $(".main-content").one('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend',
        function (e) {
          requestResize();
        });
    });

    /*** FIXED Menu APPEARS ON SCROLL DOWN ***/
    $(window).scroll(function () {
      var scroll = $(window).scrollTop();
      if (scroll >= 10) {
        $(".side-header").addClass("sticky");
      }
      else {
        $(".side-header").removeClass("sticky");
        $(".side-header").addClass("");
      }
    });

    $(".side-menus nav > ul > li ul li > a").on("click", function () {
      $(".side-header").removeClass("slide-menu");
      $(".menu-options").removeClass("active");
    });

    //***** Quick Stats *****//
    $('.show-stats').on("click", function () {
      $(".toggle-content").addClass('active');
    });

    //***** Quick Stats *****//
    $('.toggle-content > span').on("click", function () {
      $(".toggle-content").removeClass('active');
    });

    //***** Quick Stats *****//
    $('.quick-links > ul > li > a').on("click", function () {
      $(this).parent().siblings().find('.dialouge').fadeOut();
      $(this).next('.dialouge').fadeIn();
      return false;
    });

    $("html").on("click", function () {
      $(".dialouge").fadeOut();
    });
    $(".quick-links > ul > li > a, .dialouge").on("click", function (e) {
      e.stopPropagation();
    });

    //***** Toggle Full Screen *****//
    function goFullScreen() {
      var
        el = document.documentElement
        , rfs =
          el.requestFullScreen
          || el.webkitRequestFullScreen
          || el.mozRequestFullScreen
          || el.msRequestFullscreen

        ;
      rfs.call(el);
    }
    $("#toolFullScreen").on("click", function () {
      goFullScreen();
    });
  });
});


/**
 * Load Google Analytics tracker.
 */
Meteor.startup(function () {
  // To disable Google analytics, uncomment the line below.
  // TODO: use Meteor.settings to enable/disable.
  // return;

  (function (i, s, o, g, r, a, m) {
    i['GoogleAnalyticsObject'] = r; i[r] = i[r] || function () {
      (i[r].q = i[r].q || []).push(arguments)
    }, i[r].l = 1 * new Date(); a = s.createElement(o),
      m = s.getElementsByTagName(o)[0]; a.async = 1; a.src = g; m.parentNode.insertBefore(a, m)
  })(window, document, 'script', 'https://www.google-analytics.com/analytics.js', 'ga');

  // UA-76730152-2 - PDW staging app
  ga('create', 'UA-76730152-2', 'auto');
  ga('send', 'pageview');

});


/**
 * Load Hotjar tracker.
 */
Meteor.startup(function () {
  (function (h, o, t, j, a, r) {
    h.hj = h.hj || function () { (h.hj.q = h.hj.q || []).push(arguments) };
    h._hjSettings = { hjid: 457085, hjsv: 5 };
    a = o.getElementsByTagName('head')[0];
    r = o.createElement('script'); r.async = 1;
    r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv;
    a.appendChild(r);
  })(window, document, '//static.hotjar.com/c/hotjar-', '.js?sv=');
});