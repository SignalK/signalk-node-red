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

    if ( app.securityStrategy.validateLogin ) {
      console.log('enabling security')
      redSettings.adminAuth = adminAuth
    }

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

  var adminAuth = {
    type: "credentials",
    users: function(username) {
      return new Promise(function(resolve) {
        let type = app.securityStrategy.getUserType(username)
        if (type) {
          var user = { username: username, permissions: type === 'admin' ? '*' : 'read' };
          resolve(user);
        } else {
          resolve(null);
        }
      });
   },
   authenticate: function(username,password) {
     return new Promise(function(resolve) {
       app.securityStrategy.validateLogin(username, password, (valid) => {
         if ( valid ) {
           let type = app.securityStrategy.getUserType(username)
           var user = { username: "admin", permissions: type === 'admin' ? '*' : 'read' };
           resolve(user);
         } else {
           resolve(null);
         }
       })
     });
                       },
     default: function() {
       return new Promise(function(resolve) {
         if ( app.securityStrategy.allowReadOnly() ) {
           resolve({anonymous: true, permissions:"read"});
         } else {
           resolve(null)
         }
       });
     }
   }
    
  return plugin;
}
