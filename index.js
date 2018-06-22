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
const compareVersions = require('compare-versions')

module.exports = function(app) {
  var plugin = {};
  var unsubscribes = []
  var options
  var redSettings
  var supportsSecurity = compareVersions(app.config.version, '1.3.0') > 0

  plugin.id = "signalk-node-red";
  plugin.name = "Node Red";
  plugin.description = "Embeds node red in signalk node server";

  plugin.start = function(theOptions) {
    redSettings = {
       
      userDir: app.config.configPath + '/red',
      logging: {'console': { level: theOptions.logging || 'info'}},
      credentialSecret: 'jkhdfshjkfdskjhfsjfsdkjhsfdjkfsd',
      functionGlobalContext: {
        streambundle: app.streambundle,
        signalk: app.signalk,
        subscriptionmanager: app.subscriptionmanager,
        app: app,
        lodash: require('lodash'),
        geodist: require('geodist')
      }
    };

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

    if ( !supportsSecurity ) {
      redSettings.httpAdminRoot = '/redAdmin'
      redSettings.httpNodeRoot = '/redApi'
    } else {
      redSettings.httpAdminRoot = '/plugins/' + plugin.id + '/redAdmin'
      redSettings.httpNodeRoot = '/plugins/' + plugin.id + '/redApi'
    }


    RED.init(app.server, redSettings)
    RED.start()

    if ( !supportsSecurity ) {
      app.use(redSettings.httpAdminRoot, RED.httpAdmin);
      app.use(redSettings.httpNodeRoot, RED.httpNode);
    } else {
      app.get('/redAdmin', (req, res) => {
        res.redirect(redSettings.httpAdminRoot)
      })
    }

    unsubscribes.push(RED.stop)
  }

  plugin.registerWithRouter = function(router) {
    if ( supportsSecurity ) {
      router.use('/redAdmin', (req, res, next) => {
        if ( RED.httpAdmin ) {
          RED.httpAdmin(req, res, next)
        } else {
          res.status(404).send(`The ${plugin.id} plugin is not started`)
        }
      });
      router.use('/redApi', (req, res, next) => {
        if ( RED.httpNode ) {
          RED.httpNode(req, res, next)
        } else {
          res.status(404).send(`The ${plugin.id} plugin is not started`)
        }
      });
    }
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
    
  return plugin;
}
