/**
 * Copyright 2018 Scott Bender (scott@scottbender.net)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


const RED = require("node-red")

module.exports = function(app) {
  var plugin = {};
  var unsubscribes = []
  var options

  plugin.id = "signalk-node-red";
  plugin.name = "Node Red";
  plugin.description = "Embeds node red in signalk node server";

  plugin.start = function(theOptions) {
    RED.start()
  }

  plugin.registerWithRouter = function(router) {
    var redSettings = {
      /*
      httpAdminRoot: '/plugins/' + plugin.id + '/redAdmin',
      httpNodeRoot: '/plugins/' + plugin.id +  '/redApi',
      */

      httpAdminRoot: '/redAdmin',
      httpNodeRoot: '/redApi',
      
      userDir: app.config.configPath + '/red',
      functionGlobalContext: {
        streambundle: app.streambundle,
        signalk: app.signalk,
        subscriptionmanager: app.subscriptionmanager,
        app: app,
        lodash: require('lodash')
      }
    };

    RED.init(app.server, redSettings)
    app.use(redSettings.httpAdminRoot, RED.httpAdmin);
    app.use(redSettings.httpNodeRoot, RED.httpNode);
  }

  plugin.stop = function() {
    app.debug("stopping...")
    unsubscribes.forEach(f => f());
    unsubscribes = [];
  };

  plugin.schema = {
    title: "Node Red",
    properties: {
    }
  }
  
  return plugin;
}
