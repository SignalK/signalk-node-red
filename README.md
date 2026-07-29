# signalk-node-red
Node server plugin that embeds node red

You do not need to install node-red separately, just install this plugin via the app store.

Go to Webapps in the node server admin ui to get to node-red.

Security is supported with node server version 1.4.0 or greater

See https://github.com/SignalK/node-red-embedded for available Nodes.

You can access the node-red Admin console by navigating to Webapps on the node server admin console, or use a direct url like http://localhost:3000/plugins/signalk-node-red/redAdmin/

If you install node red dashboard, then the url for the dashboard will be we be http://localhost:3000/plugins/signalk-node-red/redApi/ui/

## Using the Victron nodes (node-red-contrib-victron) with a remote GX device

The [node-red-contrib-victron](https://github.com/victronenergy/node-red-contrib-victron) nodes connect to the Victron D-Bus. When Signal K does not run on the GX device itself (for example when it runs in a container or on a separate machine), set the **Victron D-Bus Address** in the plugin settings to `<gx-address>:78`, e.g. `venus.local:78` or `192.168.1.4:78`.

This requires "Insecure D-Bus over TCP" to be enabled on the GX device (`Settings → Services`, or `/Settings/Services/InsecureDbusOverTcp = 1`). The address must be in plain `host:port` form. Changing the value after the Victron nodes have connected requires a server restart to take effect.
