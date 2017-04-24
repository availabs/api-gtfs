/**
 * Routes
 *
 * Sails uses a number of different strategies to route requests.
 * Here they are top-to-bottom, in order of precedence.
 *
 * For more information on routes, check out:
 * http://sailsjs.org/#documentation
 */



/**
 * (1) Core middleware
 *
 * Middleware included with `app.use` is run first, before the router
 */


/**
 * (2) Static routes
 *
 * This object routes static URLs to handler functions--
 * In most cases, these functions are actions inside of your controllers.
 * For convenience, you can also connect routes directly to views or external URLs.
 *
 */

module.exports.routes = {

  // By default, your root route (aka home page) points to a view
  // located at `views/home/index.ejs`
  // 
  // (This would also work if you had a file at: `/views/home.ejs`)
  '/': {
    view: 'home/index'
  },
  '/agency/:id/routes': {
        controller    : 'AgencyController',
        action        : 'routes'
  },
  '/agency/:id/routes/:routeId/schedule': {
        controller    : 'AgencyController',
        action        : 'routeSchedule'
  },
  '/agency/:id/stops': {
        controller    : 'AgencyController',
        action        : 'stops'
  },
  '/agency/:id/day/:day/cache': {
        controller    : 'AgencyController',
        action        : 'createCachedObject'
  } , 
  '/agency/:id/day/:day/routeData': {
        controller    : 'AgencyController',
        action        : 'routeData'
  },
  '/agency/:id/segmentData':{
        controller    : 'AgencyController',
        action        : 'segmentData'
  },
  '/agency/:id/:day/schedule':{
        controller    : 'AgencyController',
        action        : 'simpleScheduleData'
  },
  '/agency/:id/getstop/:stopId':{
        controller    : 'AgencyController',
        action        : 'getStop'
  },
  '/agency/:id/putstop/:stopId':{
        controller    : 'AgencyController',
        action        : 'uploadStops'
  },
  '/backup/':{
        controller    : 'AgencyController',
        action        : 'backup'
  },
  'post /data/upload/stops':{
        controller    : 'AgencyController',
        action        : 'uploadStops'
  },
  'post /data/upload/route':{
        controller    : 'AgencyController',
        action        : 'uploadRoute'
  }


};
