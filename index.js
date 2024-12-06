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
const _ = require('lodash')

module.exports = function(app) {
  var plugin = {};
  var unsubscribes = []
  var options
  var redSettings
  var supportsSecurity = compareVersions(app.config.version, '1.3.0') > 0
  var deltaHandlers = []
  var didRegisterInputHandler = false

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
        plugin: plugin,
        lodash: require('lodash'),
        geodist: require('geodist')
      }
    };

    if ( theOptions.flowFile && theOptions.flowFile.length > 0 ) {
      redSettings.flowFile = theOptions.flowFile
    }
    
    if ( theOptions.settings ) {
      theOptions.settings.forEach(s => {
        try {
          app.debug('setting %s to %s', s.name, s.value)
          redSettings[s.name] = JSON.parse(s.value)
        } catch ( e ) {
          app.error(`unable to parse setting ${s.name} of ${s.value}`)
          app.setPluginError(`unable to parse setting ${s.name} of ${s.value}`)
        }
      })
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
      app.use(redSettings.httpAdminRoot, RED.httpNode);
    }

    unsubscribes.push(RED.stop)
  }

  plugin.getSelfPath = function(path, timeout) {
    let res = app.getSelfPath(path)

    if ( res && !_.isUndefined(res.value) && !_.isUndefined(res.timestamp) 
         && Date.now() - new Date(res.timestamp).getTime() < timeout ) {
      return res.value
    }

    return undefined
  }

  function deltaInputHandler(delta, next) {
    if ( deltaHandlers.length == 0 ) {
      next(delta)
      return
    }

    if ( delta.updates ) {
      delta.updates.forEach(update => {
        if ( update.values  ) {
          let newValues = []
          update.values.forEach(pathValue => {
            let matched = false
            deltaHandlers.forEach(handler => {
              if ( delta.context == handler.context
                   && pathValue.path == handler.path
                   && (!handler.source
                       || (update.$source && handler.source == update.$source)) ) {
                matched = true
                handler.callback({
                  topic: pathValue.path,
                  payload: pathValue.value,
                  $source: update.$source,
                  source: update.source,
                  context: delta.context,
                  timestamp: update.timestamp
                }, next)
              }
            })
            if ( !matched ) {
              newValues.push(pathValue)
            }
          })
          update.values = newValues
        }
      })
    }
    next(delta)
  }

  plugin.registerDeltaInputHandler = function(context, path, source, cb) {
    const info = {
      context: context === 'vessels.self' ? app.selfContext : context,
      path: path,
      source: source,
      callback: cb
    }
    deltaHandlers.push(info)
    
    if ( !this.didRegisterInputHandler ) {
      app.registerDeltaInputHandler(deltaInputHandler)
      this.didRegisterInputHandler = true
    }

    return () => {
      let idx = deltaHandlers.indexOf(info)
      deltaHandlers.splice(idx, 1)
    }
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
    didRegisterInputHandler = false
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
      },
      settings: {
        title: 'Node Red Settings',
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              title: 'Setting Name'
            },
            value: {
              type: 'string',
              title: 'Setting Value (json)'
            }
          }
        }
      }
    }
  }
    
  return plugin;
}
