var sprintf=require("sprintf-js").sprintf;
var _ = require('underscore-node');
var bus = require("hermes-bus");

var websocketLoggingEnabled = false;

// Retain a local cache of what was logged to the dashboard and console,
// so that, even if a web client connects later, it will still show all
// relevant past messages.
var logAreas = {
	dashboard: [],
	console: [],
};
var supportedLogAreaNames = Object.keys(logAreas);

bus.on("logMessage", function(loggerId, message){
	if(websocketLoggingEnabled && _.contains(supportedLogAreaNames, loggerId)) {
		logAreas[loggerId].push.apply(logAreas[loggerId], message.split(/\n/));
	}
});

bus.on("logReset", function(loggerId){
	if(websocketLoggingEnabled && _.contains(supportedLogAreaNames, loggerId)) {
		logAreas[loggerId] = [];
	}
});

// Adds a link to the web client reporting page
bus.on("logReset", function(loggerId){
	if(websocketLoggingEnabled && loggerId === "dashboard" && connectServerUri) {
		var outputTerminalWidth = (process.stdout.columns || 112);
		bus.triggerLogMessage("dashboard", "\033[H" + sprintf("%"+outputTerminalWidth+"s", "Interactive log also available at: "+connectServerUri+"/report-task-status/"));
	}
});

var connectServerUri;
bus.on("connectServerStarted", function(connectServer) {
	connectServerUri = connectServer.uri;
});

bus.on("registerCommandlineArguments", function (parser) {
	parser.addArgument(
		['--websocket-logging'],
		{
			dest: 'websocketLoggingEnabled',
			action: 'storeTrue',
			help: 'Start an interactive logger accessible via a websocket server.'
		}
	);
});
bus.on("commandlineArgumentsParsed", function (args) {
	if(args.websocketLoggingEnabled) {
		var WebSocketServer = require('ws').Server;

		var wss = new WebSocketServer({port: 3001});

		wss.on('connection', function(ws) {
			var send = function(busMessageId, args) {
				try {
					ws.send(JSON.stringify({busMessageId: busMessageId, arguments: args}));
				} catch(error) {
					console.error(error);
					// Workaround for unsubscribe:
					send = function() {};
				}
			};

			["logMessage", "logReset"].forEach(function(busMessageId) {
				bus.on(busMessageId, function() {
					send(busMessageId, _.toArray(arguments));
				});
			});

			supportedLogAreaNames.forEach(function(logAreaName) {
				logAreas[logAreaName].forEach(function(logEntry) {
					send("logMessage", [logAreaName, logEntry]);
				});
			});
		});

		websocketLoggingEnabled = args.websocketLoggingEnabled;
	}
});
