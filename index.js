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
  var redSettings

  plugin.id = "signalk-node-red";
  plugin.name = "Node Red";
  plugin.description = "Embeds node red in signalk node server";

  plugin.start = function(theOptions) {
    redSettings = {
      httpAdminRoot: '/redAdmin',
      httpNodeRoot: '/redApi',
            
      userDir: app.config.configPath + '/red',
      logging: {'console': { level: theOptions.logging || 'info'}},
      credentialSecret: 'jkhdfshjkfdskjhfsjfsdkjhsfdjkfsd',
      functionGlobalContext: {
        streambundle: app.streambundle,
        signalk: app.signalk,
        subscriptionmanager: app.subscriptionmanager,
        app: app,
        lodash: require('lodash')
      }
    };

    if ( app.securityStrategy.validateLogin ) {
      redSettings.adminAuth = adminAuth
    }

    if ( theOptions.flowFile && theOptions.flowFile.length > 0 ) {
      redSettings.flowFile = theOptions.flowFile
    }

    if ( theOptions.requires ) {
      theOptions.requires.forEach(module => {
        try {
          redSettings.functionGlobalContext[module] = require(module)
        } catch (err) {
          app.error(`unable to load module ${module} ${err}`)
        }
      })
    }

    RED.init(app.server, redSettings)
    RED.start()
    unsubscribes.push(RED.stop)
  }

  plugin.registerWithRouter = function(router) {

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
      flowFile: {
        type: 'string',
        title: 'Flow File',
        description: 'the file used to store the flows'
      },
      logging: {
        type: 'string',
        title: 'Logging',
        enum: [ 'falal', 'error', 'warn', 'info', 'debug', 'trace' ],
        default: 'info'
      },
      requires: {
        type: 'array',
        title: 'Npm modules to make available',
        items: {
          type: 'string'
        }
      }
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
