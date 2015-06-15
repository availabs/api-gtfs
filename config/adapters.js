/**
 * Global adapter config
 * 
 * The `adapters` configuration object lets you create different global "saved settings"
 * that you can mix and match in your models.  The `default` option indicates which 
 * "saved setting" should be used if a model doesn't have an adapter specified.
 *
 * Keep in mind that options you define directly in your model definitions
 * will override these settings.
 *
 * For more information on adapter configuration, check out:
 * http://sailsjs.org/#documentation
 */

module.exports.adapters = {

  // If you leave the adapter config unspecified 
  // in a model definition, 'default' will be used.
  'default': 'postgres',
  // POSTGIS DATABASE
  // This is where you want to load your GTFS DATA 
  // postgres:{
  //   module: 'sails-postgresql',
  //   host: /*'lor.availabs.org'*/'169.226.142.154',
  //   user: 'postgres',
  //   password: 'transit',
  //   database:'gtfs',
  //   port: 5432,
  //   pool: true
  // },
  postgres:{
    module: 'sails-postgresql',
    host:'127.0.0.1',
    user:'postgres',
    password:'passwd',
    database:'gtfs',
    port: 5432,
    pool: true
  },
};