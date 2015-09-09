/*
 Sencha Web Application Manager SDK 6.0.2 - JavaScript Library
 Copyright (c) 2013-2015, Sencha Inc.
 All rights reserved.
 licensing@sencha.com

 http://www.sencha.com/license


 Commercial License
 --------------------------------------------------------------------------------
 This version of Sencha Web Application Manager is licensed commercially.
 Please visit http://www.sencha.com/license for more details.


 --

 THIS SOFTWARE IS DISTRIBUTED "AS-IS" WITHOUT ANY WARRANTIES, CONDITIONS AND
 REPRESENTATIONS WHETHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION THE
 IMPLIED WARRANTIES AND CONDITIONS OF MERCHANTABILITY, MERCHANTABLE QUALITY,
 FITNESS FOR A PARTICULAR PURPOSE, DURABILITY, NON-INFRINGEMENT, PERFORMANCE
 AND THOSE ARISING BY STATUTE OR FROM CUSTOM OR USAGE OF TRADE OR COURSE OF
 DEALING.

 @license
 */

// This whole block will be removed when built and minified
if (typeof DEBUG === 'undefined') {
  DEBUG = true;

  (function() {
    var scripts = document.getElementsByTagName('script'),
      script = scripts[scripts.length - 1],
      log = console.log,
      debug = console.debug,
      info = console.info,
      warn = console.warn,
      error = console.error,
      pendingLogs = [],
      xhrTimer = null,
      logServer = script.getAttribute('logServer');// || 'http://localhost:9876/log';

    function doLog(message, type) {
      if(!logServer) {
        return;
      }

      var Communicator = Ext.space.Communicator;

      if (!xhrTimer) {
        xhrTimer = setTimeout(function() {
          var xhr = new XMLHttpRequest();

          xhr.open('POST', logServer, true);
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.send(JSON.stringify({
            logs: pendingLogs
          }));

          pendingLogs.length = 0;
          xhrTimer = null;
        }, 500);
      }

      pendingLogs.push({
        timeStamp: Date.now(),
        appId: Communicator.appId,
        device: Communicator.device,
        session: Communicator.session,
        title: document.title,
        url: window.location.href,
        message: message,
        type: type || 'log'
      });
    }

    console.log = function() {
      var message = Array.prototype.slice.call(arguments).join(' ');
      doLog(message, 'log');
      return log && log.apply(console, arguments);
    };

    console.debug = function() {
      var message = Array.prototype.slice.call(arguments).join(' ');
      doLog(message, 'debug');
      return debug && debug.apply(console, arguments);
    };

    console.info = function() {
      var message = Array.prototype.slice.call(arguments).join(' ');
      doLog(message, 'info');
      return info && info.apply(console, arguments);
    };

    console.warn = function() {
      var message = Array.prototype.slice.call(arguments).join(' ');
      doLog(message, 'warn');
      return warn && warn.apply(console, arguments);
    };

    console.error = function() {
      var message = Array.prototype.slice.call(arguments).join(' ');
      doLog(message, 'error');
      return error && error.apply(console, arguments);
    };
  })();

  $expectIdSeed = 0;

  $expect = function(name, within, object, method, verifyFn) {
    var fn = object[method],
      expectations, spy, timer, id;

    if (!fn.$isSpy) {
      object[method] = spy = function() {
        var now = Date.now(),
          i, expectation, verify;

        for (i = expectations.length - 1; i >= 0; i--) {
          expectation = expectations[i];
          verify = expectation.verify;

          if (!verify || verify.apply(object, arguments)) {
            clearTimeout(expectation.timer);
            expectations.splice(i, 1);
            console.log('[EXPECT][' + id + '][END] ' + expectation.name + ' after ' +
              (now - expectation.time) + 'ms');
          }
        }

        if (expectations.length === 0) {
          object[method] = fn;
        }

        return fn.apply(object, arguments);
      };
      spy.$isSpy = true;
      spy.$expectations = expectations = [];
    }
    else {
      spy = fn;
      expectations = spy.$expectations;
    }

    id = ++$expectIdSeed;

    timer = setTimeout(function() {
      var i, ln, expectation, id;

      for (i = 0, ln = expectations.length; i < ln; i++) {
        expectation = expectations[i];
        if (expectation.timer === timer) {
          id = expectation.id;
          expectations.splice(i, 1);
          break;
        }
      }

      console.error('[EXPECT][' + id + '][FAILED]: ' + name + ' within ' + within + 'ms');
    }, within);

    expectations.push({
      id: id,
      name: name,
      time: Date.now(),
      verifyFn: verifyFn,
      timer: timer
    });

    console.log('[EXPECT][' + id + '][START] ' + name + ' within ' + within + 'ms');
  };

  window.onerror = function(message, line, file) {
    console.error('[window.onerror][' + line + '][' + file + '] ' + message);
  }
}

/**
 * @class Ext
 */

/**
 * @property {Boolean} isSpace
 * @readonly
 * True if the application is currently running inside of Sencha Web Application Client
 */

/**
 * @property {Boolean} isSpaceReady
 * @readonly
 * True if Sencha Web Application Client has fully initialized the webview the
 * application is running in, indicating that it is now safe to call any Sencha API
 * functions.
 *
 * See also Ext.onSpaceReady
 */

/**
 * @method onSpaceReady
 * @param {Function} callback
 * @return {Ext.space.Promise}
 */

(function(global) {
  var Ext = global.Ext;

  if (typeof Ext == 'undefined') {
    global.Ext = Ext = {};
  }

  var Base = function() {};

  Base.prototype = {
    constructor: function() {}
  };

  if (!('define' in Ext)) {
    Ext.define = function(name, members) {
      var Class = function() {
          return this.constructor.apply(this, arguments);
        },
        root = global,
        parts = name.split('.'),
        ln = parts.length - 1,
        leaf = parts[ln],
        statics = members.statics,
        extend = members.extend || Base,
        prototype, key, value, part, i;

      delete members.extend;
      Class.prototype = prototype = Object.create(extend.prototype);
      Class.superclass = prototype.superclass = extend.prototype;

      delete members.statics;

      if (statics) {
        for (key in statics) {
          value = statics[key];
          Class[key] = value;
        }
      }

      for (key in members) {
        value = members[key];
        prototype[key] = value;
      }

      if (members.singleton) {
        Class = new Class();
      }

      for (i = 0; i < ln; i++) {
        part = parts[i];
        root = root[part] || (root[part] = {});
      }

      root[leaf] = Class;

      return Class;
    };
  }

  var match = typeof window != 'undefined' && window.navigator.userAgent.match(/SenchaSpace\/([0-9\.]+)/),
    readyListeners = [],
    spaceReady = null; // lazy init because Ext.space.Promise isn't defined yet

  if (match) {
    Ext.isSpace = true;
    Ext.spaceVersion = match[1];
  }

  if (!('apply' in Ext)) {
    Ext.apply = function(object, config) {
      var key, value;

      for (key in config) {
        value = config[key];
        object[key] = value;
      }

      return object;
    };
  }

  Ext.isSpaceReady = false;
  Ext.onSpaceReady = function(callback, scope) {
    if (!spaceReady) {
      spaceReady = new Ext.space.Promise();
    }
    if (Ext.spaceIsWindowsPhone) {
      // windows phone might not be ready yet
      setTimeout(function() {
        if (!Ext.isSpace) {
          spaceReady.reject("Not in Space");
        }
      }, 5000);
    } else {
      if (!Ext.isSpace) {
        return spaceReady.reject("Not in Space");
      }
    }
    return callback ? spaceReady.then(callback.bind(scope)) : spaceReady;
  };
  Ext.setSpaceReady = function(appId) {
    if (!spaceReady) {
      spaceReady = new Ext.space.Promise();
    }
    Ext.isSpaceReady = true;
    Ext.spaceAppId = appId;
    spaceReady.fulfill();
  };

  Ext.spaceIsIos = /(iPad|iPhone|iPod)/i.test(window.navigator.userAgent);
  Ext.spaceIsAndroid = /Android/i.test(window.navigator.userAgent);
  Ext.spaceIsBlackBerry = /(BlackBerry|BB10)/i.test(window.navigator.userAgent);
  Ext.spaceIsWindowsPhone = /Windows Phone/i.test(window.navigator.userAgent);
})(this);

/**
 * Send log messages to the console, filtered by log level.
 *
 * The log levels available are properties on this object:
 *
 *      Ext.space.Logger.LOG   // "LOG"
 *      Ext.space.Logger.ERROR // "ERROR"
 *      Ext.space.Logger.WARN  // "WARN"
 *      Ext.space.Logger.INFO  // "INFO" (default)
 *      Ext.space.Logger.DEBUG // "DEBUG"
 *
 * Each log level has a corresponding method that logs its arguments to the console
 * using the appropriate method on the console, optionally prefixed by the name of
 * the log level. Messages logged with `Ext.space.Logger.log(...)` are always logged
 * regardless of the current log level, but the rest take it into account.
 *
 *      var logger = Ext.space.Logger;
 *
 *      logger.level(); // "INFO" by default
 *
 *      logger.log("This message is always logged no matter what");
 *      logger.info("Info level message, gets skipped.");
 *
 *      logger.level(logger.DEBUG);
 *
 *      logger.info("Info level message, gets shown this time.");
 *
 *      logger.usePrefix = true;
 *      logger.warn("This one will be prefixed by 'WARN'");
 *
 *      logger.error("Multiple", ["argument", "error"], {prop: "message"});
 *
 * Note that the "ERROR" log level doesn't throw actual errors; that's up to the
 * application itself.
 *
 * You can also track custom application-defined events (defined as a collection of
 * basically arbitrary strings: category, action, label (optional), extra (optional))
 * with Ext.space.Logger.logEvent(). These get logged at the level provided to
 * Ext.space.Logger.eventLevel(...) (default Ext.space.Logger.INFO), and also
 * submitted to the Sencha Web Application Manager server for report generation in
 * the administration console.
 *
 */
Ext.define('Ext.space.Logger', {
  singleton: true,

  /**
   * @readonly
   */
  LOG: "LOG",

  /**
   * @readonly
   */
  ERROR: "ERROR",

  /**
   * @readonly
   */
  WARN: "WARN",

  /**
   * @readonly
   */
  INFO: "INFO",

  /**
   * @readonly
   */
  DEBUG: "DEBUG",

  /**
   * @private
   */
  levels: null,

  /**
   * @private
   */
  _level: 0,

  /**
   * @private
   */
  _eventLevel: 0,

  /**
   * Determines whether logged messages are prefixed with their log level.
   * type {Boolean}
   */
  usePrefix: false,

  /**
   * @private
   */
  constructor: function() {
    this.levels = {
      byLevel: [this.ERROR, this.WARN, this.INFO, this.DEBUG],
      byName: {}
    };
    var idx = this.levels.byName;
    var name = this.levels.byLevel;

    for (var i=0; i<name.length; i++) {
      idx[name[i]] = i;
      if (name[i] != this.LOG) {
        var method = this._getLevelMethodName(name[i]);
        this[method] = this._mklogger(method, name[i], i);
      }
    }
    this.level(this.INFO);
    this.eventLevel(this.INFO);
  },

  /**
   * Creates the logging methods
   * @private
   */
  _mklogger: function(method, prefix, level) {
    return function() {
      if (level <= this._level) {
        console[method].apply(console, this.usePrefix ? [prefix].concat(Array.prototype.slice.call(arguments)) : arguments);
      }
    };
  },

  /**
   * Convert a level name to a method name
   * @private
   */
  _getLevelMethodName: function(levelName) {
    return levelName.toLowerCase();
  },

  /**
   * Log a message to the console, regardless of the log level.
   */
  log: function() {
    console.log.apply(console, this.usePrefix ? [this.LOG].concat(Array.prototype.slice.call(arguments)) : arguments);
  },

  /**
   * Get or set the current log level for the given internal property name.
   * @private
   */
  _doLevel: function(prop, levelName) {
    if (arguments.length) {
      // only change the level if it's directly supported; otherwise no-op
      if (this.levels.byName.hasOwnProperty(levelName)) {
        this[prop] = this.levels.byName[levelName];
      }
    }
    return this.levels.byLevel[this[prop]];
  },

  /**
   * Get or set the current log level.
   *
   * @param {String} levelName (optional) log level to set: "ERROR", "WARN", "INFO", "DEBUG"
   * @return {String} Current log level
   */
  level: function(levelName) {
    return this._doLevel("_level", levelName);
  },

  /**
   * Get or set the current log level to be used for custom events.
   *
   * @param {String} levelName (optional) log level to set: "ERROR", "WARN", "INFO", "DEBUG"
   * @return {String} Current log level
   */
  eventLevel: function(levelName) {
    return this._doLevel("_eventLevel", levelName);
  },

  /**
   * Send a custom event to the server.
   *
   * Events are a somewhat free-form set of arbitrary strings that facilitate
   * grouping in administrative reports. They're required to have a `category` and
   * `action` and can optionally also be given a `label` and/or `extra` data. Sencha
   * Web Application Client will attempt to submit the event data to the server,
   * and if the server is not accessible (for example, if the user is offline), it
   * will store the event for submission later.
   *
   *      Ext.space.Logger.logEvent({
     *          category: "Contact",
     *          action: "Contact form submission",
     *          label: "From footer",
     *          extra: "someone@example.com"
   *      }).then(function() {
     *          // do something, if you want
     *      }, function(error) {
     *          // something went wrong, nothing worked, everything is terrible
     *      });
   *
   * @param {Object} kwArgs Custom event definition
   * @param {String} kwArgs.category Event category name
   * @param {String} kwArgs.action Event action name
   * @param {String} kwArgs.label (optional) Event label
   * @param {String} kwArgs.extra (optional) Extra event information
   * @return {Ext.space.Promise} Promise that resolves when the event is sent
   */
  logEvent: function(kwArgs) {
    var result = new Ext.space.Promise();

    if (kwArgs) {
      if (!kwArgs.category) {
        result.reject("Missing required event category");

      } else if (!kwArgs.action) {
        result.reject("Missing required event action");

      } else {
        var args = {
          command: "Event#log",
          timestamp: Date.now(),
          category: kwArgs.category,
          action: kwArgs.action,
          callbacks: {
            onSuccess: function() {
              result.fulfill();
            },
            onError: function(error) {
              result.reject(error);
            }
          }
        };
        if (kwArgs.label) {
          args.label = kwArgs.label;
        }
        if (kwArgs.extra) {
          args.extra = kwArgs.extra;
        }

        // so... much... indirection...
        this[this._getLevelMethodName(this.eventLevel())]("Event:", kwArgs);

        Ext.space.Communicator.send(args);

      }
    } else {
      result.reject("Missing event descriptor");
    }

    return result;
  }
});

/*global DEBUG */
/**
 * @private
 *
 * This object handles communication between the WebView and Sencha's native shell.
 * Currently it has two primary responsibilities:
 *
 * 1. Maintaining unique string ids for callback functions, together with their scope objects
 * 2. Serializing given object data into HTTP GET request parameters
 *
 * As an example, to capture a photo from the device's camera, we use `Ext.space.Camera.capture()` like:
 *
 *     Ext.space.Camera.capture(
 *         function(dataUri){
 *             // Do something with the base64-encoded `dataUri` string
 *         },
 *         function(errorMessage) {
 *
 *         },
 *         callbackScope,
 *         {
 *             quality: 75,
 *             width: 500,
 *             height: 500
 *         }
 *     );
 *
 * Internally, `Ext.space.Communicator.send()` will then be invoked with the following argument:
 *
 *     Ext.space.Communicator.send({
 *         command: 'Camera#capture',
 *         callbacks: {
 *             onSuccess: function() {
 *                 // ...
 *             },
 *             onError: function() {
 *                 // ...
 *             }
 *         },
 *         scope: callbackScope,
 *         quality: 75,
 *         width: 500,
 *         height: 500
 *     });
 *
 * Which will then be transformed into a HTTP GET request, sent to native shell's local
 * HTTP server with the following parameters:
 *
 *     ?quality=75&width=500&height=500&command=Camera%23capture&onSuccess=3&onError=5
 *
 * Notice that `onSuccess` and `onError` have been converted into string ids (`3` and `5`
 * respectively) and maintained by `Ext.space.Communicator`.
 *
 * Whenever the requested operation finishes, `Ext.space.Communicator.invoke()` simply needs
 * to be executed from the native shell with the corresponding ids given before. For example:
 *
 *     Ext.space.Communicator.invoke('3', ['DATA_URI_OF_THE_CAPTURED_IMAGE_HERE']);
 *
 * will invoke the original `onSuccess` callback under the given scope. (`callbackScope`), with
 * the first argument of 'DATA_URI_OF_THE_CAPTURED_IMAGE_HERE'
 *
 * Note that `Ext.space.Communicator` maintains the uniqueness of each function callback and
 * its scope object. If subsequent calls to `Ext.space.Communicator.send()` have the same
 * callback references, the same old ids will simply be reused, which guarantee the best possible
 * performance for a large amount of repetitive calls.
 */
Ext.define('Ext.space.Communicator', {
  singleton: true,

  SERVER_URL: 'http://127.0.0.1:30015/', // Change this to the correct server URL

  callbackDataMap: null,

  callbackIdMap: null,

  idSeed: 0,

  globalScopeId: '0',

  apiQueue: null,

  DEFAULT_QUEUE_NAME: "___defaultQueue",

  constructor: function() {
    this.readySendQueue = [];
    this.callbackDataMap = {};
    this.callbackIdMap = {};
    this.apiQueue = {};

    // choose our platform-specific comms mechanism
    if (Ext.spaceIsBlackBerry) {
      this.doSend = this.doSendBlackBerry.bind(this);
    }
    else if (Ext.spaceIsAndroid) {
      this.doSend = this.doSendAndroid.bind(this);
    }
    else if (Ext.spaceIsWindowsPhone) {
      this.doSend = this.doSendWindowsPhone.bind(this);
    }
    else if (Ext.spaceIsIos) {
      this.doSend = this.doSendDefault.bind(this);
    }

  },

  globalOnError: function(error) {
    if (DEBUG) {
      throw new Error("[Communicator#globalOnError] " + (error || "Unknown error"));
    }
  },

  init: function(info) {
    var queue = this.readySendQueue,
      appId = info.appId,
      device = info.device,
      session = info.session,
      currentAppId = info.currentAppId,
      messages = info.messages;

    if (DEBUG && !appId) {
      throw new Error("[Communicator#init] Missing appId");
    }

    if (DEBUG && !device) {
      throw new Error("[Communicator#init] Missing device info");
    }

    if (DEBUG && !session) {
      throw new Error("[Communicator#init] Missing session info");
    }

    if (DEBUG && !messages || !Array.isArray(messages)) {
      throw new Error("[Communicator#init] Missing messages");
    }

    Ext.isSpace = true;

    if (info.version) {
      Ext.spaceVersion = info.version;
    }

    this.device = device;
    this.session = session;
    this.appId = appId;

    Ext.setSpaceReady(currentAppId);

    Ext.space.Invoke.invoke(messages);

    if (queue.length > 0) {
      queue.forEach(function(args) {
        this.send(args);
      }, this);

      queue.length = 0;
    }

    this.watchTitle();
  },

  watchTitle: function() {
    var me = this,
      target = document.querySelector('head > title');

    if (!target) {
      return;
    }

    if (window.WebKitMutationObserver) {
      var observer = new window.WebKitMutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          me.send({
            command: 'TitleWatcher#update',
            title: mutation.target.textContent
          });
        });
      });

      observer.observe(target, { subtree: true, characterData: true, childList: true });
    }
    else {
      target.addEventListener('DOMCharacterDataModified', function() {
        me.send({
          command: 'TitleWatcher#update',
          title: document.title
        });
      }, true);
    }
  },

  generateId: function() {
    return String(++this.idSeed);
  },

  getId: function(object) {
    var id = object.$callbackId;

    if (!id) {
      object.$callbackId = id = this.generateId();
    }

    return id;
  },

  getCallbackId: function(callback, scope, queueName) {
    var idMap = this.callbackIdMap,
      dataMap = this.callbackDataMap,
      id, scopeId, callbackId, data;

    if (!scope) {
      scopeId = this.globalScopeId;
    }
    else if (scope.isIdentifiable) {
      scopeId = scope.getId();
    }
    else {
      scopeId = this.getId(scope);
    }

    callbackId = this.getId(callback);

    if (!idMap[scopeId]) {
      idMap[scopeId] = {};
    }

    // note that the queue name is only set the first time a callback has an ID
    // assigned; this creates an obvious limitation wherein we can't process the
    // same bridge method in different call queues since the queue name provided
    // above is ignored once once it's been set here
    if (!idMap[scopeId][callbackId]) {
      id = this.generateId();
      data = {
        callback: callback,
        scope: scope
      };
      if (queueName) {
        data.queue = queueName;
      }

      idMap[scopeId][callbackId] = id;
      dataMap[id] = data;
    }

    return idMap[scopeId][callbackId];
  },

  getCallbackData: function(id) {
    return this.callbackDataMap[id];
  },

  invoke: function(id, args) {
    DEBUG && Ext.space.Logger.debug("Communicator.invoke(" + id + ", " + JSON.stringify(args) + ")");
    var data = this.getCallbackData(id);

    // If args is a string, assume it is a JSON encoded array and deserialize it.
    if (Object.prototype.toString.call(args) === '[object String]') {
      args = JSON.parse(args);
    }

    this[data.queue ? "doQueuedInvoke" : "doInvoke"](data, args);
  },

  doInvoke: function(data, args) {
    // run the bridge method's callback function
    data.callback.apply(data.scope, args);
  },

  doQueuedInvoke: function(data, args) {
    // run the bridge method's callback function and kick off the next queued call
    var queue = this.apiQueue[data.queue || this.DEFAULT_QUEUE_NAME];
    if (DEBUG && !queue) {
      throw new Error("[Communicator#invoke] Expected queue '" + data.queue + "' to exist, but it doesn't.");
    }
    this.doInvoke(data, args);
    queue.shift();
    if (queue.length) {
      this.doSend(queue[0]);
    }
  },

  send: function(args, synchronous) {
    if (!Ext.isSpaceReady) {
      if (synchronous) {
        throw new Error('A synchronous request was made before Space was ready.');
      }

      this.readySendQueue.push(args);
      return;
    }

    var callbacks, scope, name, callback, queue, callbackQueue;

    if (!args) {
      args = {};
    }

    // set up the API queue for this bridge method, if any
    if (synchronous) {
      args.queue = false; // won't try to queue synchronous calls
    }
    callbackQueue = this.setupCallbackQueue(args);

    if (args.callbacks) {
      callbacks = args.callbacks;
      scope = args.scope;

      delete args.callbacks;
      delete args.scope;

      for (name in callbacks) {
        if (callbacks.hasOwnProperty(name)) {
          callback = callbacks[name];

          if (typeof callback == 'function') {
            args[name] = this.getCallbackId(callback, scope, callbackQueue);
          }
        }
      }
    }

    // always pass an onError callback
    if (!args.onError) {
      if (args.failure) {
        // got a set of old style success/failure callbacks
        args.onError = this.getCallbackId(function(error) {
          return callbacks.failure.apply(this, arguments);
        }, scope, callbackQueue);
      } else {
        // fall back to using the global handler
        args.onError = this.getCallbackId(this.globalOnError, scope, callbackQueue);
      }
    }

    // either fire off the request immediately, or queue it up if one is already
    // active for the given queue
    if (!args.queue) {
      Ext.space.Logger.debug(args.command, args);
      return this.doSend(args, synchronous);
    } else {
      // push it onto the queue even if it will be sent immediately, to
      // indicate that there's an active request
      queue = this.apiQueue[callbackQueue];
      queue.push(args);
      if (queue.length === 1) {
        Ext.space.Logger.debug(args.command, args);
        return this.doSend(args);
      } else {
        Ext.space.Logger.debug(args.command, args, "QUEUED (" + callbackQueue + ")");
        // the request is queued, don't actually send it
      }
    }
  },

  setupCallbackQueue: function(args) {
    var callbackQueue = null;
    if (args.queue) {
      // should never use this last default in actual practice, because
      // omitting a command is an error
      callbackQueue = args.queueName || args.command || this.DEFAULT_QUEUE_NAME;
      if (!this.apiQueue[callbackQueue]) {
        this.apiQueue[callbackQueue] = [];
      }
    }
    return callbackQueue;
  },

  doSend: function() {
    // many platforms overwrite this method in the constructor; if a platform
    // doesn't, then it should supply a global hook to do the comms
    if (window.__space_communicator_send_hook__) {
      window.__space_communicator_send_hook__.apply(Ext.space.Communicator, arguments);
    }
    // else { // noop! }
  },

  doSendBlackBerry: function(args, synchronous) {
    var data = {
      args: args,
      appId: this.appId,
      sync: synchronous
    };

    navigator.cascades.postMessage(window.btoa(JSON.stringify(data)));

    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'getdata', false);
    xhr.send(null);

    var result = xhr.responseText;

    if (result) {
      return JSON.parse(result);
    }
  },

  doSendAndroid: function(args, synchronous) {
    var data = {
      args: args,
      appId: this.appId,
      sync: synchronous
    };

    var result;

    if(window.Sencha) {
      result = window.Sencha.action(JSON.stringify(data));
    } else {
      result = prompt("whatever", "sencha:"+JSON.stringify(data));
    }

    if (!result) {
      result = '""';
    }

    if (result) {
      return JSON.parse(result);
    }
  },

  doSendWindowsPhone: function(args, synchronous) {
    var data = {
      args: args,
      appId: this.appId,
      sync: synchronous
    };

    try {
      window.external.notify(JSON.stringify(data));
    } catch(e) {}
  },

  doSendDefault: function(args, synchronous) {
    var response, data, xhr;

    xhr = new XMLHttpRequest();
    xhr.open('POST', this.SERVER_URL + '?_dc=' + new Date().getTime(), !synchronous);
    xhr.setRequestHeader('Content-Type', 'text/plain');

    if (!this.appId) {
      throw new Error("Missing appId at this point");
    }

    data = {
      args: args,
      appId: this.appId,
      sync: synchronous
    };

    data = JSON.stringify(data);

    if (!synchronous) {
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
          var status = xhr.status;

          if (status !== 200) {
            throw new Error("Failed communicating to native bridge, got status code: " + status + ". " +
              "XHR Data: " + data);
          }
        }
      };
    }

    xhr.send(data);

    if (synchronous) {
      response = xhr.responseText;

      try {
        response = JSON.parse(response);
      }
      catch (e) {
      }

      return response;
    }
  },

  notifyReady: function() {
    var Communicator = Ext.space.Communicator,
      communicatorInitId = Communicator.getCallbackId(Communicator.init, Communicator);

    if (Ext.spaceIsIos) {
      window.location = 'sencha://ready.local/' + communicatorInitId;
    }
    else {
      this.doSend({
        command: "ViewStateManager#setOnReady",
        callback: communicatorInitId
      });
    }
  }
});

/**
 * Ext.space.Promise an Asynchronous API based on the Promises A+ spec http://promisesaplus.com
 *
 * Promises are used extensively by Sencha Web Application Client's APIs. Most APIs
 * return promises. In the case of Ext.space.Invoke, the called application needs to
 * create, return, and resolve promises.
 *
 * To understand how promises work, here is a simple promise-based version of `setTimeout`:
 *
 *     function wait(time) {
 *         var promise = new Ext.space.Promise();
 *
 *         setTimeout(function(){
 *              promise.fulfill({resolved: new Date().getTime()});
 *         }, time);
 *
 *         return promise;
 *     }
 *
 * First create the promise, then return the promise so that the caller can react to
 * the result of the promise.
 *
 * The promise can later be resolved when the data is available:
 *
 *     promise.fulfill(response);
 *
 * If an error occurs, call reject on the promise:
 *
 *     promise.reject(errorMessage);
 *
 *
 * Now your code can call wait instead of setTimeout:
 *
 *     wait(1000).then(success, failure);
 *
 *     var success = function(result) {
 *         // Do something with the result
 *         Ext.space.Logger.log("resolved at" + result.resolved);
 *     };
 *
 *     var failure = function(error) {
 *         Ext.space.Logger.error('Something went wrong', error);
 *     }
 */
Ext.define('Ext.space.Promise', {
  statics: {
    when: function() {
      var ret = new this,
        promises = Array.prototype.slice.call(arguments),
        index = -1,
        results = [],
        promise;

      function onRejected(e) {
        ret.reject(e);
      }

      /**
       * @param {*} [result]
       */
      function onFulfilled(result) {
        promise = promises.shift();

        if (index >= 0) {
          results[index] = result;
        }

        index++;

        if (promise) {
          promise.then(onFulfilled, onRejected);
        }
        else {
          ret.fulfill.apply(ret, results);
        }
      }

      onFulfilled();

      return ret;
    },

    whenComplete: function(promises) {
      var ret = new this,
        index = -1,
        fulfilledResults = [],
        rejectedReasons = [],
        promise;

      function onRejected(reason) {
        promise = promises.shift();
        rejectedReasons.push(reason);
        next(promise);
      }

      /**
       * @param [result]
       */
      function onFulfilled(result) {
        promise = promises.shift();
        fulfilledResults.push(arguments);
        next(promise);
      }

      function next(promise) {
        index++;

        if (promise) {
          promise.then(onFulfilled, onRejected);
        }
        else {
          ret.fulfill.call(ret, {
            fulfilled: fulfilledResults,
            rejected: rejectedReasons
          });
        }
      }

      next(promises.shift());

      return ret;
    },

    from: function() {
      var promise = new this;
      promise.completed = 1;
      promise.lastResults = arguments;
      return promise;
    },

    fail: function(reason) {
      var promise = new this;
      promise.completed = -1;
      promise.lastReason = reason;
      return promise;
    }
  },

  completed: 0,

  getListeners: function(init) {
    var listeners = this.listeners;

    if (!listeners && init) {
      this.listeners = listeners = [];
    }

    return listeners;
  },

  then: function(success, error) {
    var Promise = Ext.space.Promise,
      completed = this.completed,
      promise, result;

    if (completed === -1) {
      if (error) {
        error(this.lastReason);
      }
      return this;
    }

    if (completed === 1 && !this.isFulfilling) {
      if (!success) {
        return this;
      }

      result = success.apply(null, this.lastResults);

      if (result instanceof Promise) {
        promise = result;
      }
      else {
        promise = Promise.from(result);
      }
    }
    else {
      promise = new Promise;
      promise.$owner = this;

      this.getListeners(true).push({
        success: success,
        error: error,
        promise: promise
      });
    }

    return promise;
  },

  error: function(error) {
    return this.then(null, error);
  },

  /**
   *
   * @param {Object...} results
   * @returns {Ext.space.Promise}
   */
  fulfill: function() {
    var results = arguments,
      listeners, listener, success, promise, callbackResults;

    this.lastResults = results;
    this.completed = 1;

    while (listeners = this.getListeners()) {
      delete this.listeners;
      this.isFulfilling = true;

      while (listener = listeners.shift()) {
        success = listener.success;

        if (success) {
          promise = listener.promise;
          delete promise.$owner;

          callbackResults = success.apply(null, results);

          if (callbackResults instanceof Ext.space.Promise) {
            callbackResults.connect(promise);
          }
          else {
            promise.fulfill(callbackResults);
          }
        }
      }

      this.isFulfilling = false;
    }

    return this;
  },

  connect: function(promise) {
    this.then(function(result) {
      promise.fulfill(result);
      return result;
    }, promise.reject.bind(promise));
  },

  /**
   *
   * @param {Object} reason
   * @returns {Ext.space.Promise}
   */
  reject: function(reason) {
    var listeners = this.getListeners(),
      listener, error, promise;

    this.lastReason = reason;
    this.completed = -1;

    if (listeners) {
      delete this.listeners;
      while (listener = listeners.shift()) {
        error = listener.error;
        promise = listener.promise;
        delete promise.$owner;

        if (error) {
          error(reason);
        }

        promise.reject(reason);
      }
    }

    return this;
  },

  cancel: function() {
    var listeners = this.getListeners(),
      owner = this.$owner,
      i, ln, listener;

    if (listeners) {
      for (i = 0, ln = listeners.length; i < ln; i++) {
        listener = listeners[i];
        listener.promise.cancel();
      }
      listeners.length = 0;
      delete this.listeners;
    }

    if (owner) {
      delete this.$owner;
      owner.cancel();
    }
  }
});

// if we're not in an ExtJS 6+ environment, alias for backwards compatibility with
// our original promise implementation
if (typeof Ext.Promise == "undefined") {
  Ext.Promise = Ext.space.Promise;
}

/**
 * @private
 */
Ext.define('Ext.space.Observable', {
  constructor: function() {
    this.listeners = [];
  },

  isWatching: false,

  startWatching: function() {},

  invokeListeners: function() {
    var listeners = this.listeners,
      ln = listeners.length,
      i = 0,
      listener;

    for (; i < ln; i++) {
      listener = listeners[i];
      listener[0].apply(listener[1], arguments);
    }
  },

  addListener: function(callback, scope) {
    if (!this.isWatching) {
      this.isWatching = true;
      this.startWatching();
    }

    this.listeners.push(arguments);
  },

  on: function() {
    this.addListener.apply(this, arguments);
  }
});

/**
 * @aside guide sensor_apis
 * ## Example
 *
 * You can use the {@link Ext.space.Camera#capture} function to take a photo:
 *
 *   var promise = Ext.space.Camera.capture({
 *       destination: 'file'
 *       collection: 'photos'
 *   });
 *
 *
 * By specifying a destination of 'file' capture will store the selected photo in the
 * applications Secure File system. The promise resolves with the `Ext.space.files.File`
 * that represents the file:
 *
 *     promise.then(function(file){
 *         file.view(); // display the photo in Sencha's file viewer.
 *     })
 *
 * Specifying a collection when capturing a photo will place that photo inside to the
 * named collection on the filesytem. See `Ext.space.files.Collection` for more details.
 * It is a good idea to keep all of the application's photos organized inside of
 * collections.
 *
 * See `Ext.space.files.File` for details on how to use the captured photo.
 * File contains a URL that can be used to display the image using an img tag.
 * The file can also be viewed in a new tab (Ext.space.files.File.view)
 * Because the file is store persistent make sure to delete photos you no-longer need.
 *
 * See the documentation for {@link Ext.space.Camera#capture} all available configurations.
 */
Ext.define('Ext.space.Camera', {
  singleton: true,

  source: {
    library: 0,
    camera: 1,
    album: 2
  },

  destination: {
    data: 0, // Returns base64-encoded string
    file: 1  // Returns file's URI
  },

  encoding: {
    jpeg: 0,
    jpg: 0,
    png: 1
  },

  /**
   * Allows you to capture a photo.
   *
   * @param {Object} options
   * The options to use when taking a photo.
   *
   * @param {Number} options.quality
   * The quality of the image which is returned in the callback. This should be a percentage.
   *
   * @param {String} options.source
   * The source of where the image should be taken. Available options are:
   *
   * - **album** - prompts the user to choose an image from an album
   * - **camera** - prompts the user to take a new photo (default)
   * - **library** - prompts the user to choose an image from the library
   *
   * @param {String} options.destination
   * The destination of the image which is returned. Available options are:
   *
   * - **data** - returns a base64 encoded string (default)
   * - **file** - Will store captured photo in the applications file system. returns an Ext.space.files.File
   *
   * @param {String} options.collection
   * The name of the Ext.space.files.Collection where the file should be stored.
   *
   *
   * @param {String} options.encoding
   * The encoding of the returned image. Available options are:
   *
   * - **jpg** (default)
   * - **png**
   *
   * @param {Number} options.width
   * The width of the image to return
   *
   * @param {Number} options.height
   * The height of the image to return
   *
   *
   * @return {Ext.space.Promise} Promise that resolves when the image is captured
   */
  capture: function(options) {
    var sources = this.source,

      destinations = this.destination,
      encodings = this.encoding,
      path = options.collection,
      source = options.source || "camera",
      destination = options.destination || "data",
      encoding = options.encoding || "jpg";


    var result = new Ext.space.Promise();

    if (sources.hasOwnProperty(source)) {
      source = sources[source];
    }

    if (destinations.hasOwnProperty(destination)) {
      destination = destinations[destination];
    }

    if (encodings.hasOwnProperty(encoding)) {
      encoding = encodings[encoding];
    }

    Ext.space.Communicator.send({
      command: 'Camera#capture',
      callbacks: {
        success: function(image){
          if(destinations.file === destination) {
            Ext.space.SecureFiles.getFile(image).connect(result);
          } else {
            result.fulfill(image);
          }

        },
        failure: function(error){
          result.reject(error);
        }
      },
      scope: options.scope,
      quality: options.quality,
      width: options.width,
      height: options.height,
      source: source,
      destination: destination,
      encoding: encoding,
      path: path
    });
    return result;
  }
});

/**
 @aside guide sensor_apis
 * This class is used to check if the current device is currently online or not.
 *
 * ## Examples
 *

 Ext.space.Connection.getStatus().then(function(status){
        log("is online" + status.online + " " + status.type)
    });

 *
 * The available connection types are:
 *
 * - {@link Ext.space.Connection#UNKNOWN UNKNOWN} - Unknown connection
 * - {@link Ext.space.Connection#ETHERNET ETHERNET} - Ethernet connection
 * - {@link Ext.space.Connection#WIFI WIFI} - WiFi connection
 * - {@link Ext.space.Connection#CELL_2G CELL_2G} - Cell 2G connection
 * - {@link Ext.space.Connection#CELL_3G CELL_3G} - Cell 3G connection
 * - {@link Ext.space.Connection#CELL_4G CELL_4G} - Cell 4G connection
 * - {@link Ext.space.Connection#NONE NONE} - No network connection
 *
 * @mixins Ext.space.connection.Abstract
 *
 * @aside guide native_apis
 */
Ext.define('Ext.space.Connection', {
  extend: Ext.space.Observable,

  singleton: true,

  /**
   * @property {String} UNKNOWN
   * Text label for a connection type.
   */
  UNKNOWN: 'Unknown connection',

  /**
   * @property {String} ETHERNET
   * Text label for a connection type.
   */
  ETHERNET: 'Ethernet connection',

  /**
   * @property {String} WIFI
   * Text label for a connection type.
   */
  WIFI: 'WIFI',

  /**
   * @property {String} CELL_2G
   * Text label for a connection type.
   */
  CELL_2G: 'Cell 2G',

  /**
   * @property {String} CELL_3G
   * Text label for a connection type.
   */
  CELL_3G: 'Cell 3G',

  /**
   * @property {String} CELL_4G
   * Text label for a connection type.
   */
  CELL_4G: 'Cell 4G',

  /**
   * @property {String} NONE
   * Text label for a connection type.
   */
  NONE: 'No network',

  startWatching: function() {
    Ext.space.Communicator.send({
      command: 'Connection#watch',
      callbacks: {
        callback: this.doConnectionChange
      },
      scope: this
    });
  },

  getStatus: function() {
    var result = new Ext.space.Promise();
    var self = this;
    Ext.space.Communicator.send({
      command: 'Connection#getStatus',
      callbacks: {
        callback: function(status){
          result.fulfill(self._convertStatus(status));
        }
      }
    });
    return result;
  },

  /**
   *@private
   * converts the raw status object from the bridge into a usable version
   */
  _convertStatus: function(status){
    var isOnline = status.online == "1";
    var type = status.type;
    var typeString = this[status.type]
    return {online: isOnline, type: type, typeString: typeString };
  },

  doConnectionChange: function(e) {
    this.invokeListeners(this._convertStatus(e));
  }
});

/**
 * ## Examples
 *
 * To show a simple notification:
 *
 *     Ext.space.Notification.show({
 *         title: 'Verification',
 *         message: 'Is your email address: test@sencha.com',
 *         buttons: ['OK', 'Cancel'],
 *         callback: function(button) {
 *             if (button === 'OK') {
 *                 Ext.space.Logger.log('Verified');
 *             } else {
 *                 Ext.space.Logger.log('Nope');
 *             }
 *         }
 *     });
 *
 * To make the device vibrate:
 *
 *     Ext.space.Notification.vibrate();
 *
 * @mixins Ext.space.notification.Abstract
 *
 * @aside guide native_apis
 */
Ext.define('Ext.space.Notification', {
  singleton: true,

  /**
   * @private
   */
  events: null,

  /**
   * @private
   */
  _listeningForNotifications: false,


  /**
   * @private
   */
  constructor: function() {
    this.events = {
      badge: new Ext.space.Observable(),
      alert: new Ext.space.Observable(),
      data: new Ext.space.Observable()
    };
  },

  /**
   * Start listening for push notifications
   *
   * @private
   */
  _listenForNotifications: function() {
    this._listeningForNotifications = true;
    Ext.onSpaceReady().then(function() {
      Ext.space.Communicator.send({
        command: "Notification#registerHandler",
        callbacks: {
          onApplicationBadgeChange: this._onBadgeChange.bind(this),
          onApplicationAlertReceived: this._onAlert.bind(this),
          onApplicationDataReceived: this._onData.bind(this),
          onSuccess: function() { /* no need to do anything */ }
        }
      });
    }.bind(this));
  },

  show: function(config) {
    Ext.space.Communicator.send({
      command: 'Notification#show',
      callbacks: {
        callback: config.callback
      },
      scope  : config.scope,
      title  : config.title,
      message: config.message,
      buttons: config.buttons.join(',') //@todo fix this
    });
  },

  vibrate: function() {
    Ext.space.Communicator.send({
      command: 'Notification#vibrate'
    });
  },

  /**
   * Gets the current badge value for the application.
   *
   * @return {Ext.space.Promise} Promise that resolves with the badge value
   */
  getBadge: function() {
    var result = new Ext.space.Promise();

    Ext.space.Communicator.send({
      command: "Notification#getCurrentBadge",
      callbacks: {
        onSuccess: function(badge) {
          result.fulfill(badge);
        },
        onError: function(error) {
          result.reject(error);
        }
      }
    });

    return result;
  },

  /**
   * Sets the badge value for the application.
   *
   * @param {string} badge badge value; null or empty string will clear the badge.
   * @return {Ext.space.Promise} Promise that resolves when the badge value is set.
   */
  setBadge: function(badge) {
    var result = new Ext.space.Promise();

    Ext.space.Communicator.send({
      command: "Notification#setCurrentBadge",
      badge: badge,
      callbacks: {
        onSuccess: function() {
          result.fulfill();
        },
        onError: function(error) {
          result.reject(error);
        }
      }
    });

    return result;
  },

  /**
   * Clears the current badge for the application.
   *
   * @return {Ext.space.Promise} Promise that resolves when the badge value is cleared.
   */
  clearBadge: function() {
    return this.setBadge("");
  },

  /**
   * Show an alert, similar to an alert from a push notification.
   *
   * @param {object} config config object for the alert
   *                      message {string} - alert message
   *                      icon {string} - an optional url for the alert
   *                      tags {array} - array of tag strings
   * @return {Ext.space.Promise} Promise that resolves when the alert is shown.
   */
  showAlert: function(config) {
    var result = new Ext.space.Promise();

    Ext.space.Communicator.send({
      command: "Notification#showAlert",
      message: config.message,
      tags: config.tags,
      icon: config.icon,
      callbacks: {
        onSuccess: function() {
          result.fulfill();
        },
        onError: function(error) {
          result.reject(error);
        }
      }
    });

    return result;
  },

  /**
   * Get the application's notification settings.
   *
   * sendPushNotifications {boolean}            - if push notifications will be forwarded from the server
   * clientPushNotificationSettings {boolean}   - if the user can opt in/out of push notifications
   * userAlerts {boolean}                       - if the user has enabled alerts
   * userBadges {boolean}                       - if the user has enabled badges
   */
  getNotificationSettings: function() {
    var result = new Ext.space.Promise();

    Ext.space.Communicator.send({
      command: "Notification#getNotificationSettings",
      callbacks: {
        onSuccess: function(settings) {
          result.fulfill(settings);
        },
        onError: function(error) {
          result.reject(error);
        }
      }
    });

    return result;
  },

  /**
   * Callback that fires when the application's badge has changed.
   *
   * @private
   * @param {string} badgeValue the new badge's value.
   */
  _onBadgeChange: function(badgeValue) {
    this.events.badge.invokeListeners(badgeValue);
  },

  /**
   * Register a callback to run when the application's badge has changed.
   *
   *      function onBadgeChanged(badge) {
     *          Ext.space.Logger.log("New Badge: " + badge);
     *      }
   *
   *      Ext.space.Notification.onBadgeChange(onBadgeChanged);
   *
   * @param {Function} callback Callback for when the application's badge has changed.
   */
  onBadgeChange: function(callback) {
    if (!this._listeningForNotifications) {
      this._listenForNotifications();
    }
    this.events.badge.addListener(callback);
  },

  /**
   * Callback that fires when an alert is received.
   *
   * @private
   * @param {object} alert the alert object.
   */
  _onAlert: function(alert) {
    this.events.alert.invokeListeners(alert);
  },

  /**
   * Register a callback to run when an alert is received.
   *
   *      function onAlertReceived(alert) {
     *          Ext.space.Logger.log("New alert: " + alert.message);
     *          // alert.icon string of the icon
     *          // alert.tags contains an array of tags
     *      }
   *
   *      Ext.space.Notification.onAlert(onAlertReceived);
   *
   * @param {Function} callback Callback for when an alert is received.
   */
  onAlert: function(callback) {
    if (!this._listeningForNotifications) {
      this._listenForNotifications();
    }
    this.events.alert.addListener(callback);
  },

  /**
   * Callback that fires when data is received.
   *
   * @private
   * @param {string} data the data string.
   */
  _onData: function(data) {
    this.events.data.invokeListeners(data);
  },

  /**
   * Register a callback to run when data is received.
   *
   *      function onDataReceived(data) {
     *          Ext.space.Logger.log("Data: " + data);
     *      }
   *
   *      Ext.space.Notification.onData(onDataReceived);
   *
   * @param {Function} callback Callback for when data is received.
   */
  onData: function(callback) {
    if (!this._listeningForNotifications) {
      this._listenForNotifications();
    }
    this.events.data.addListener(callback);
  }
});


/**
 * This class provides you with a cross platform way of listening to when the the orientation changes on the
 * device your application is running on.
 *
 * The {@link Ext.space.Orientation#orientationchange orientationchange} event gets passes the `alpha`, `beta` and
 * `gamma` values.
 *
 * You can find more information about these values and how to use them on the [W3C device orientation specification](http://dev.w3.org/geo/api/spec-source-orientation.html#deviceorientation).
 *
 * ## Example
 *
 * To listen to the device orientation, you can do the following:
 *
 *     Ext.space.Orientation.on({
*         scope: this,
*         orientationchange: function(e) {
*             Ext.space.Logger.log('Alpha: ', e.alpha);
*             Ext.space.Logger.log('Beta: ', e.beta);
*             Ext.space.Logger.log('Gamma: ', e.gamma);
*         }
*     });
 *
 * @mixins Ext.space.orientation.Abstract
 *
 * @aside guide native_apis
 */
Ext.define('Ext.space.Orientation', {
  extend: Ext.space.Observable,

  singleton: true,

  /**
   * From the native shell, the callback needs to be invoked infinitely using a timer, ideally 50 times per second.
   * The callback expects one event object argument, the format of which should looks like this:
   *
   *     {
     *          alpha: 0,
     *          beta: 0,
     *          gamma: 0
     *     }
   *
   * Refer to [Safari DeviceOrientationEvent Class Reference][1] for more details.
   *
   * [1]: http://developer.apple.com/library/safari/#documentation/SafariDOMAdditions/Reference/DeviceOrientationEventClassRef/DeviceOrientationEvent/DeviceOrientationEvent.html
   */
  startWatching: function() {
    Ext.space.Communicator.send({
      command: 'Orientation#watch',
      callbacks: {
        callback: this.doDeviceOrientation
      },
      scope: this
    });
  },

  onDeviceOrientation: function() {
    this.addListener.apply(this, arguments);
  },

  doDeviceOrientation: function(e) {
    this.invokeListeners(e);
  }

  /**
   * @event orientationchange
   * Fired with the device's orientation changes.
   * @param {Object} event
   * @param {Number} event.alpha
   * @param {Number} event.beta
   * @param {Number} event.gamma
   */
});

Ext.define('Ext.space.invoke.Connection', {
  constructor: function(receiverId) {
    this.receiverId = receiverId;
    this.proxyMap = {};
  },

  send: function(message, foreground) {
    return Ext.space.Invoke.send(this.receiverId, message, foreground);
  },

  get: function(name){
    var proxy = this.proxyMap[name],
      connection = this;
    if (!proxy) {
      proxy = this.proxyMap[name] = Ext.space.Invoke.send(this.receiverId, {"$control": {"action": 'getProxy', 'name':  name}}, false).then(function(obj){
        return new Ext.space.invoke.Proxy(connection,name,obj.methods);
      })
    }
    return proxy;
  },

  receive: function(message) {}
});

Ext.define('Ext.space.invoke.Proxy', {
  constructor: function(conection,ObjectName,methods) {
    this.connection = conection;
    this.remoteObjectName =ObjectName;

    for (var i = methods.length - 1; i >= 0; i--) {
      var method = methods[i];
      this[method] = this._makeMethod(method);
    }

  },

  _makeMethod: function(method) {
    var self = this;

    return function(options, foreground){
      return self.connection.send({"$control": {"action": 'callProxy','name' : this.remoteObjectName, 'method': method, options: options} },foreground);
    }

  }
});

/**
 * @aside guide invoke
 * The Invoke API allows Applications running inside a Sencha Web Application Client
 * to communicate. Applications can securely exchange data with each other.
 *
 * When one application requests data from another, that application loads, and the
 * user is shown the called app. Once the user is done interacting with the called
 * app, the called app returns data back to the calling application, and Sencha Web
 * Application Client returns the user to the original application.
 *
 * The two primary functions for Invoke are `Ext.space.Invoke.get` and
 * `Ext.space.Invoke.onMessage`
 *
 * For additional information on how to use  please see our
 * [Invoke Guide](#!/guide/invoke) and [example applications](#!/guide/examples)
 */
Ext.define('Ext.space.Invoke', {
  singleton: true,

  messageId: 0,


  /*
   * @private
   */
  constructor: function() {
    this.pendingReceivePromises = {};
    this.connections = {};
    this.connectQueue = [];
    this.messageQueue = [];
    this.proxies = [];
  },


  /*
   * @private
   */
  invoke: function(messages) {
    var me = this;

    if (!Array.isArray(messages)) {
      throw new Error('[Invoke#invoke] Invalid messages, must be an array');
    }

    // Unblock native thread
    setTimeout(function() {
      messages.forEach(function(message) {
        me.onReceived(message);
      });
    }, 1);
  },

  /**
   * Get a connection to another application.

   Ext.space.Invoke.get('photos').then(send, failure);

   var failure = function(error) {
            Ext.space.Logger.error('Received error:', error);
        }

   var send = function(connection) {
            connection.send(data, background).then(
                success,
                failure
            );
        };

   * @param {String} receiverId The ID of the application to connect to. Get this ID from #broadcast
   * @returns {Ext.space.Promise}
   */
  get: function(broadcastMessage) {
    var connections = this.connections,
      connection = connections[broadcastMessage];

    if (connection) {
      return Ext.space.Promise.from(connection);
    }
    else {
      return this.broadcast(broadcastMessage).then(function(receiverIds) {
        connections[broadcastMessage] = connection = new Ext.space.invoke.Connection(receiverIds[0].id);
        return connection;
      }.bind(this));
    }
  },

  /**
   * Send a message
   * @private
   * @param {String} receiverId The ID of the application to connect to. Get this ID from #broadcast
   * @param {*} message The message to send, can be an object, as long as it is JSON-able.
   * @param {Boolean} [foreground] Whether or not to bring the receiver app to the foreground.
   * @returns {Ext.space.Promise}
   */
  send: function(receiverId, message, foreground) {
    var messageId = this.messageId++,
      receivePromise = new Ext.space.Promise(),
      sendPromise = this.doSend(receiverId, messageId, message, foreground),
      pendingReceivePromises = this.pendingReceivePromises;

    pendingReceivePromises[messageId] = receivePromise;

    sendPromise.error(function(reason) {
      delete pendingReceivePromises[messageId];
      receivePromise.reject(reason);
    });

    return receivePromise;
  },

  /**
   * @private
   * Assign the callback to handle a new connection.
   * The Boolean returned value determines whether or not
   * to accept the connection.
   * @param {Function} callback
   */
  onConnect: function(callback) {
    var queue = this.connectQueue.slice(0),
      i, ln, args;

    this.connectQueue.length = 0;

    if (callback) {
      this.connectCallback = callback;

      for (i = 0, ln = queue.length; i < ln; i++) {
        args = queue[i];
        this.onReceived.apply(this, args);
      }
    }
  },

  /**
   * @private
   *
   *
   */
  register: function(name, obj) {

    var proxy = this.proxies[name];

    //someone could be waiting for this proxy to be registered
    //if not create a new promise.
    if(!proxy) {
      proxy = new Ext.space.Promise();
      this.proxies[name] =proxy;
    }

    var temp = {
      name: name,
      methods: []
    };

    /*
     * Extract all the functions from the passed object.
     */
    for(var property in obj) {
      if(obj.propertyIsEnumerable(property) && typeof obj[property] == "function"){
        Ext.space.Logger.info(property, obj.propertyIsEnumerable(property));
        temp.methods.push(property);
      }
    }

    proxy.fulfill(temp);

  },

  /**
   *   onMessage registers a function to be called each time another application
   *   invokes this application.
   *
   *   For example for the photos application to respond to a request to get photos:
   *
   *       Invoke.onMessage(function(appId, message) {
     *          var promise = new Ext.space.Promise();
     *
     *          Ext.space.Logger.log('Got message from ' + appId + ' ' + message);
     *
     *          // Do whatever is needed asynchronously before returning the result
     loaded          //  (fulfilling the promise)
     *          setTimeout(function(){
     *             promise.fulfill('Yeah I got it');
     *          }, 3000);
     *
     *          return promise;
     *      });
   * @param {Function} callback
   */
  onMessage: function(callback) {
    var queue = this.messageQueue.slice(0),
      i, ln, args;

    this.messageQueue.length = 0;

    if (callback) {
      this.messageCallback = callback;

      for (i = 0, ln = queue.length; i < ln; i++) {
        args = queue[i];
        this.onReceived.apply(this, args);
      }
    }
  },

  /**
   * @private
   */
  onAppConnect: function() {
    return this.connectCallback.apply(this, arguments);
  },

  /**
   * @private
   */
  onAppMessage: function(appId, message) {
    var connection = this.connections[appId],
      response;

    if (connection) {
      response = connection.receive(message);
    }

    if (typeof response == 'undefined') {
      response = this.messageCallback.apply(this, arguments);
    }

    return response;
  },

  /**
   * @private
   */
  onReceived: function(data) {
    var appId = data.appId,
      message = data.message,
      messageId = data.id,
      foreground = data.foreground,
      pendingReceivePromises = this.pendingReceivePromises,
      pendingPromise = pendingReceivePromises[messageId],
      connectCallback = this.connectCallback,
      messageCallback = this.messageCallback,
      response;

    delete pendingReceivePromises[messageId];

    // A response
    if (pendingPromise) {
      if (message.error) {
        pendingPromise.reject(message.error);
      }
      else {
        pendingPromise.fulfill(message.success);
      }
    }
    // A request
    else {
      try {
        if (message === '__CONNECT__') {
          if (!connectCallback) {
            this.connectQueue.push(arguments);
            return;
          }
          else {
            response = this.onAppConnect(appId);
          }
        } else if (message.$control){
          Ext.space.Logger.info("Got control object!", message);
          response = this.handleControlMethod(appId, message.$control, messageId, foreground);
        } else {
          if (!messageCallback) {
            this.messageQueue.push(arguments);
            return;
          }
          else {
            response = this.onAppMessage(appId, message);
          }
        }

        var invoke = this;
        if (response && typeof response.then == "function") {
          response.then(function(result) {
            invoke.doSend(appId, messageId, {
              success: result
            }, foreground);
          }, function(reason) {
            invoke.doSend(appId, messageId, {
              error: reason
            }, foreground);
          });
        }
        else {
          this.doSend(appId, messageId, {
            success: response
          }, foreground);
        }
      }
      catch (e) {
        this.doSend(appId, messageId, {
          error: e
        }, foreground);
        throw e;
      }
    }

  },

  /**
   *@private
   *
   Handle app to app control messages
   Fetch an RPC proxy
   Call a proxy method
   add or remove an event listener

   control: {
        action: "getProxy|callProxy|addListener|removeListener"
        name: 'Test', Name of either proxy or event
        method: 'foo'   name of proxy method
    }


   */
  handleControlMethod: function(appId,control, messageId, foreground){
    var result;
    var self = this;
    var handlers = {
      getProxy: function(){
        var proxy = self.proxies[control.name];
        if(!proxy){
          proxy = new Ext.space.Promise();
          self.proxies[name] =proxy;
        }
        return proxy;//{methods:["first", "second", "third"]};
      },
      callProxy: function(){
        return {"a" : "b"};
      }
    };

    if(control.action && handlers[control.action]) {
      result = handlers[control.action]();
    } else {
      throw 'Invalid control action';
    }
    return result;

    /*this.doSend(appId, messageId, {
     success:
     }, foreground);*/
  },

  /**
   * @private
   * Broadcast a message (intent) to look for receivers who can respond to the message.
   * @param message
   * @returns {Ext.space.Promise} A promise that provides an array of objects to fulfill.
   * Each object contains information about a receiver, with 'id', 'name', and 'icon' keys.
   */
  broadcast: function(message) {
    var promise = new Ext.space.Promise;

    Ext.space.Communicator.send({
      command: 'Invoke#connect',
      callbacks: {
        success: function(result) {
          if (!result || result.length === 0) {
            promise.reject({
              code: 1,
              message: "There are no receivers for this connection"
            });
            return;
          }

          promise.fulfill(result);
        },
        failure: function(reason) {
          promise.reject(reason);
        }
      },
      message: message
    });

    return promise;
  },

  /**
   * @private
   * @param receiverId
   * @param messageId
   * @param message
   * @param foreground
   * @returns {Ext.space.Promise}
   */
  doSend: function(receiverId, messageId, message, foreground) {
    var promise = new Ext.space.Promise,
      appId = Ext.space.Communicator.appId;

    var success = function(result) {
      promise.fulfill(result);
    };

    success.args = arguments;

    Ext.space.Communicator.send({
      command: 'Invoke#send',
      callbacks: {
        success: success,
        failure: function(reason) {
          promise.reject(reason);
        }
      },
      receiverId: receiverId,
      foreground: foreground,
      message: {
        id: messageId,
        appId: appId,
        message: message,
        foreground: foreground
      }
    });

    return promise;
  }
});

/**
 * @private
 * The Entry class which is used to represent entries in a file system,
 * each of which may be a {@link Ext.space.filesystem.FileEntry} or a {@link Ext.space.filesystem.DirectoryEntry}.
 *
 * This is an abstract class.
 * @abstract
 */
Ext.define('Ext.space.filesystem.Entry', {
  directory: false,
  path: 0,
  fileSystem: null,

  constructor: function(directory, path, fileSystem) {
    this.directory = directory;
    this.path = path;
    this.fileSystem = fileSystem;
  },

  /**
   * Returns whether the entry is a file.
   *
   * @return {Boolean}
   * The entry is a file.
   */
  isFile: function() {
    return !this.directory;
  },

  /**
   * Returns whether the entry is a directory.
   *
   * @return {Boolean}
   * The entry is a directory.
   */
  isDirectory: function() {
    return this.directory;
  },

  /**
   * Returns the name of the entry, excluding the path leading to it.
   *
   * @return {String}
   * The entry name.
   */
  getName: function() {
    var components = this.path.split('/');
    for (var i = components.length - 1; i >= 0; --i) {
      if (components[i].length > 0) {
        return components[i];
      }
    }

    return '/';
  },

  /**
   * Returns the full absolute path from the root to the entry.
   *
   * @return {String}
   * The entry full path.
   */
  getFullPath: function() {
    return this.path;
  },

  /**
   * Returns the file system on which the entry resides.
   *
   * @return {Ext.space.filesystem.FileSystem}
   * The entry file system.
   */
  getFileSystem: function() {
    return this.fileSystem;
  },

  /**
   * Moves the entry to a different location on the file system.
   *
   * @param {Object} config
   * The object which contains the following config options:
   *
   * @param {Ext.space.filesystem.DirectoryEntry} config.parent This is required.
   * The directory to which to move the entry.
   *
   * @param {String} config.newName This is optional.
   * The new name of the entry to move. Defaults to the entry's current name if unspecified.
   *
   * @param {Function} config.success This is optional.
   * The callback to be called when the entry has been successfully moved.
   *
   * @param {Ext.space.filesystem.Entry} config.success.entry
   * The entry for the new location.
   *
   * @param {Function} config.failure This is optional.
   * The callback to be called when an error occurred.
   *
   * @param {Object} config.failure.error
   * The occurred error.
   *
   * @param {Object} config.scope
   * The scope object
   */
  moveTo: function(config) {
    if (config.parent == null) {
      throw new Error('Ext.space.filesystem.Entry#moveTo: You must specify a new `parent` of the entry.');
      return null;
    }

    var me = this;
    Ext.space.Communicator.send({
      command: 'FileSystem#moveTo',
      path: this.path,
      fileSystemId: this.fileSystem.id,
      parentPath: config.parent.path,
      newName: config.newName,
      copy: config.copy,
      callbacks: {
        success: function(path) {
          if (config.success) {
            var entry = me.directory
              ? new Ext.space.filesystem.DirectoryEntry(path, me.fileSystem)
              : new Ext.space.filesystem.FileEntry(path, me.fileSystem);

            config.success.call(config.scope || this, entry);
          }
        },
        failure: function(error) {
          if (config.failure) {
            config.failure.call(config.scope || this, error);
          }
        }
      },
      scope: config.scope || this
    });
  },

  /**
   * Works the same way as {@link Ext.space.filesystem.Entry#moveTo}, but copies the entry.
   */
  copyTo: function(config) {
    this.moveTo(Ext.apply(config, {
      copy: true
    }));
  },

  /**
   * Removes the entry from the file system.
   *
   * @param {Object} config
   * The object which contains the following config options:
   *
   * @param {Function} config.success This is optional.
   * The callback to be called when the entry has been successfully removed.
   *
   * @param {Function} config.failure This is optional.
   * The callback to be called when an error occurred.
   *
   * @param {Object} config.failure.error
   * The occurred error.
   *
   * @param {Object} config.scope
   * The scope object
   */
  remove: function(config) {
    Ext.space.Communicator.send({
      command: 'FileSystem#remove',
      path: this.path,
      fileSystemId: this.fileSystem.id,
      recursively: config.recursively,
      callbacks: {
        success: function() {
          if (config.success) {
            config.success.call(config.scope || this);
          }
        },
        failure: function(error) {
          if (config.failure) {
            config.failure.call(config.scope || this, error);
          }
        }
      },
      scope: config.scope || this
    });
  },

  /**
   * Looks up the parent directory containing the entry.
   *
   * @param {Object} config
   * The object which contains the following config options:
   *
   * @param {Function} config.success This is required.
   * The callback to be called when the parent directory has been successfully selected.
   *
   * @param {Ext.space.filesystem.DirectoryEntry} config.success.entry
   * The parent directory of the entry.
   *
   * @param {Function} config.failure This is optional.
   * The callback to be called when an error occurred.
   *
   * @param {Object} config.failure.error
   * The occurred error.
   *
   * @param {Object} config.scope
   * The scope object
   */
  getParent: function(config) {
    if (!config.success) {
      throw new Error('Ext.space.filesystem.Entry#getParent: You must specify a `success` callback.');
      return null;
    }

    var me = this;
    Ext.space.Communicator.send({
      command: 'FileSystem#getParent',
      path: this.path,
      fileSystemId: this.fileSystem.id,
      callbacks: {
        success: function(path) {
          var entry = me.directory
            ? new Ext.space.filesystem.DirectoryEntry(path, me.fileSystem)
            : new Ext.space.filesystem.FileEntry(path, me.fileSystem);

          config.success.call(config.scope || this, entry);
        },
        failure: function(error) {
          if (config.failure) {
            config.failure.call(config.scope || this, error);
          }
        }
      },
      scope: config.scope || this
    });
  }
});

/**
 * @private
 * The DirectoryEntry class which is used to represent a directory on a file system.
 */
Ext.define('Ext.space.filesystem.DirectoryEntry', {
  extend: Ext.space.filesystem.Entry,

  constructor: function(path, fileSystem) {
    Ext.space.filesystem.DirectoryEntry.superclass.constructor.apply(this, [true, path, fileSystem]);
  },

  /**
   * Lists all the entries in the directory.
   *
   * @param {Object} config
   * The object which contains the following config options:
   *
   * @param {Function} config.success This is required.
   * The callback to be called when the entries has been successfully read.
   *
   * @param {Ext.space.filesystem.Entry[]} config.success.entries
   * The array of entries of the directory.
   *
   * @param {Function} config.failure This is optional.
   * The callback to be called when an error occurred.
   *
   * @param {Object} config.failure.error
   * The occurred error.
   *
   * @param {Object} config.scope
   * The scope object
   */
  readEntries: function(config) {
    if (!config.success) {
      throw new Error('Ext.space.filesystem.DirectoryEntry#readEntries: You must specify a `success` callback.');
      return null;
    }

    var me = this;
    Ext.space.Communicator.send({
      command: 'FileSystem#readEntries',
      path: this.path,
      fileSystemId: this.fileSystem.id,
      callbacks: {
        success: function(entryInfos) {
          var entries = entryInfos.map(function(entryInfo) {
            return entryInfo.directory
              ? new Ext.space.filesystem.DirectoryEntry(entryInfo.path, me.fileSystem)
              : new Ext.space.filesystem.FileEntry(entryInfo.path, me.fileSystem);
          });

          config.success.call(config.scope || this, entries);
        },
        failure: function(error) {
          if (config.failure) {
            config.failure.call(config.scope || this, error);
          }
        }
      },
      scope: config.scope || this
    });
  },

  /**
   * Creates or looks up a file.
   *
   * @param {Object} config
   * The object which contains the following config options:
   *
   * @param {String} config.path This is required.
   * The absolute path or relative path from the entry to the file to create or select.
   *
   * @param {Object} config.options This is optional.
   * The object which contains the following options:
   *
   * @param {Boolean} config.options.create This is optional.
   * Indicates whether to create a file, if path does not exist.
   *
   * @param {Boolean} config.options.exclusive This is optional. Used with 'create', by itself has no effect.
   * Indicates that method should fail, if path already exists.
   *
   * @param {Function} config.success This is optional.
   * The callback to be called when the file has been successfully created or selected.
   *
   * @param {Ext.space.filesystem.Entry} config.success.entry
   * The created or selected file.
   *
   * @param {Function} config.failure This is optional.
   * The callback to be called when an error occurred.
   *
   * @param {Object} config.failure.error
   * The occurred error.
   *
   * @param {Object} config.scope
   * The scope object
   */
  getFile: function(config) {
    if (config.path == null) {
      throw new Error('Ext.space.filesystem.DirectoryEntry#getFile: You must specify a `path` of the file.');
      return null;
    }

    if (config.options == null) {
      config.options = {};
    }

    var me = this;
    Ext.space.Communicator.send({
      command: 'FileSystem#getEntry',
      path: this.path,
      fileSystemId: this.fileSystem.id,
      newPath: config.path,
      directory: config.directory,
      create: config.options.create,
      exclusive: config.options.exclusive,
      callbacks: {
        success: function(path) {
          if (config.success) {
            var entry = config.directory
              ? new Ext.space.filesystem.DirectoryEntry(path, me.fileSystem)
              : new Ext.space.filesystem.FileEntry(path, me.fileSystem);

            config.success.call(config.scope || this, entry);
          }
        },
        failure: function(error) {
          if (config.failure) {
            config.failure.call(config.scope || this, error);
          }
        }
      },
      scope: config.scope || this
    });
  },

  /**
   * Works the same way as {@link Ext.space.filesystem.DirectoryEntry#getFile},
   * but creates or looks up a directory.
   */
  getDirectory: function(config) {
    this.getFile(Ext.apply(config, {
      directory: true
    }));
  },

  /**
   * Works the same way as {@link Ext.space.filesystem.Entry#remove},
   * but removes the directory and all of its contents, if any.
   */
  removeRecursively: function(config) {
    this.remove(Ext.apply(config, {
      recursively: true
    }));
  }
});

/**
 * @private
 * The FileEntry class which is used to represent a file on a file system.
 */
Ext.define('Ext.space.filesystem.FileEntry', {
  extend: Ext.space.filesystem.Entry,

  offset: 0,

  constructor: function(path, fileSystem) {
    Ext.space.filesystem.FileEntry.superclass.constructor.apply(this, [false, path, fileSystem]);

    this.offset = 0;
  },

  /**
   * Returns the byte offset into the file at which the next read/write will occur.
   *
   * @return {Number}
   * The file offset.
   */
  getOffset: function() {
    return this.offset;
  },

  /**
   * Sets the byte offset into the file at which the next read/write will occur.
   *
   * @param {Object} config
   * The object which contains the following config options:
   *
   * @param {Number} config.offset This is required.
   * The file offset to set. If negative, the offset back from the end of the file.
   *
   * @param {Function} config.success This is optional.
   * The callback to be called when the file offset has been successfully set.
   *
   * @param {Function} config.failure This is optional.
   * The callback to be called when an error occurred.
   *
   * @param {Object} config.failure.error
   * The occurred error.
   *
   * @param {Object} config.scope
   * The scope object
   */
  seek: function(config) {
    if (config.offset == null) {
      throw new Error('Ext.space.filesystem.FileEntry#seek: You must specify an `offset` in the file.');
      return null;
    }

    var me = this;
    Ext.space.Communicator.send({
      command: 'FileSystem#seek',
      path: this.path,
      fileSystemId: this.fileSystem.id,
      offset: config.offset,
      callbacks: {
        success: function(offset) {
          me.offset = offset;

          if (config.success) {
            config.success.call(config.scope || this);
          }
        },
        failure: function(error) {
          if (config.failure) {
            config.failure.call(config.scope || this, error);
          }
        }
      },
      scope: config.scope || this
    });
  },

  /**
   * Reads the data from the file starting at the file offset.
   *
   * @param {Object} config
   * The object which contains the following config options:
   *
   * @param {Number} config.length This is optional.
   * The length of bytes to read from the file. Defaults to the file's current size if unspecified.
   *
   * @param {Function} config.success This is optional.
   * The callback to be called when the data has been successfully read.
   *
   * @param {Object} config.success.data
   * The read data.
   *
   * @param {Function} config.failure This is optional.
   * The callback to be called when an error occurred.
   *
   * @param {Object} config.failure.error
   * The occurred error.
   *
   * @param {Object} config.scope
   * The scope object
   */
  read: function(config) {
    var me = this;
    Ext.space.Communicator.send({
      command: 'FileSystem#read',
      path: this.path,
      fileSystemId: this.fileSystem.id,
      offset: this.offset,
      length: config.length,
      callbacks: {
        success: function(result) {
          me.offset = result.offset;

          if (config.success) {
            config.success.call(config.scope || this, result.data);
          }
        },
        failure: function(error) {
          if (config.failure) {
            config.failure.call(config.scope || this, error);
          }
        }
      },
      scope: config.scope || this
    });
  },

  /**
   * Writes the data to the file starting at the file offset.
   *
   * @param {Object} config
   * The object which contains the following config options:
   *
   * @param {Object} config.data This is required.
   * The data to write to the file.
   *
   * @param {Function} config.success This is optional.
   * The callback to be called when the data has been successfully written.
   *
   * @param {Function} config.failure This is optional.
   * The callback to be called when an error occurred.
   *
   * @param {Object} config.failure.error
   * The occurred error.
   *
   * @param {Object} config.scope
   * The scope object
   */
  write: function(config) {
    if (config.data == null) {
      throw new Error('Ext.space.filesystem.FileEntry#write: You must specify a `data` for the file.');
      return null;
    }

    var me = this;
    Ext.space.Communicator.send({
      command: 'FileSystem#write',
      path: this.path,
      fileSystemId: this.fileSystem.id,
      offset: this.offset,
      data: config.data,
      callbacks: {
        success: function(offset) {
          me.offset = offset;

          if (config.success) {
            config.success.call(config.scope || this);
          }
        },
        failure: function(error) {
          if (config.failure) {
            config.failure.call(config.scope || this, error);
          }
        }
      },
      scope: config.scope || this
    });
  },

  /**
   * Truncates or extends the file to the specified size in bytes.
   * If the file is extended, the added bytes are null bytes.
   *
   * @param {Object} config
   * The object which contains the following config options:
   *
   * @param {Number} config.size This is required.
   * The new file size.
   *
   * @param {Function} config.success This is optional.
   * The callback to be called when the file size has been successfully changed.
   *
   * @param {Function} config.failure This is optional.
   * The callback to be called when an error occurred.
   *
   * @param {Object} config.failure.error
   * The occurred error.
   *
   * @param {Object} config.scope
   * The scope object
   */
  truncate: function(config) {
    if (config.size == null) {
      throw new Error('Ext.space.filesystem.FileEntry#truncate: You must specify a `size` of the file.');
      return null;
    }

    var me = this;
    Ext.space.Communicator.send({
      command: 'FileSystem#truncate',
      path: this.path,
      fileSystemId: this.fileSystem.id,
      offset: this.offset,
      size: config.size,
      callbacks: {
        success: function(offset) {
          me.offset = offset;

          if (config.success) {
            config.success.call(config.scope || this);
          }
        },
        failure: function(error) {
          if (config.failure) {
            config.failure.call(config.scope || this, error);
          }
        }
      },
      scope: config.scope || this
    });
  }
});

/**
 * @private
 */
Ext.define('Ext.space.filesystem.FileSystem', {
  id: 0,
  root: null,

  constructor: function(id) {
    this.id = id;
    this.root = new Ext.space.filesystem.DirectoryEntry('/', this);
  },

  /**
   * Returns a {@link Ext.space.filesystem.DirectoryEntry} instance for the root of the file system.
   *
   * @return {Ext.space.filesystem.DirectoryEntry}
   * The file system root directory.
   */
  getRoot: function() {
    return this.root;
  }
});

/**
 * @private
 */
Ext.define('Ext.space.FileSystem', {
  singleton: true,

  /**
   * Requests a {@link Ext.space.filesystem.FileSystem} instance.
   *
   * @param {Object} config
   * The object which contains the following config options:
   *
   * @param {Function} config.type This is optional.
   * The type of a file system to request. Specify "LOCKER" to request the File Locker.
   *
   * @param {Function} config.success This is required.
   * The callback to be called when the file system has been successfully created.
   *
   * @param {Ext.space.filesystem.FileSystem} config.success.fileSystem
   * The created file system.
   *
   * @param {Function} config.failure This is optional.
   * The callback to be called when an error occurred.
   *
   * @param {Object} config.failure.error
   * The occurred error.
   *
   * @param {Object} config.scope
   * The scope object
   */
  requestFileSystem: function(config) {
    if (!config.success) {
      throw new Error('Ext.space.filesystem#requestFileSystem: You must specify a `success` callback.');
      return null;
    }

    Ext.space.Communicator.send({
      command: 'FileSystem#requestFileSystem',
      callbacks: {
        type: config.type,
        success: function(id) {
          var fileSystem = new Ext.space.filesystem.FileSystem(id);

          config.success.call(config.scope || this, fileSystem);
        },
        failure: function(error) {
          if (config.failure) {
            config.failure.call(config.scope || this, error);
          }
        }
      },
      scope: config.scope || this
    });
  }
});

/**
 *  A Key/Value store where the data is persisted to an encrypted store inside of Sencha Web Application Client instead of plain text.
 This class should not be created directly but instead should be obtained via Ext.space.SecureLocalStorage
 *
 */
Ext.define("Ext.space.localstorage.Collection", {
  /**
   * @private
   */
  queries: null,

  /**
   * @private
   */
  activeQuery: null,

  /**
   * @private
   */
  constructor: function(name, loaded) {
    //add code to normalize name to sql table name limits
    this.name = name;
    this.loaded = loaded;
    this.queries = [];
  },

  /**
   * @private
   */
  runQueries: function() {
    var collection = this;

    function next(query) {
      collection.activeQuery = query || null;

      if (collection.activeQuery) {
        collection.loaded.then(function(db) {
          var transaction = db.createTransaction();
          transaction.sql(query.query, query.params).then(function(results) {
            query.promise.fulfill(results);
            next(collection.queries.shift());
          });
          return transaction.execute();

        }).error(function(e) {
          query.promise.reject(e);
        });
      }
    }

    next(this.queries.shift());
  },

  /**
   * @private
   */
  query: function(query, params) {
    var queryPromise = new Ext.space.Promise();
    this.queries.push({
      query: query,
      params: params,
      promise: queryPromise
    });
    if (!this.activeQuery) {
      this.runQueries();
    }
    return queryPromise;
  },



  /**
   * Get the value for a key

   var secrets = Ext.space.SecureLocalStore.get('secrets');

   secrets.get('myKey').then(function(object){
            var a = object.field;
        });

   * @param {String} key  The key to get a value for.
   * @return {Ext.space.Promise} the promise that will resolve when the value is fetched.
   *
   */
  get: function(key){
    return this.query("select value from item where collection = ? and name = ?", [this.name, key]).then(function(rs){
      Ext.space.Logger.debug("value ", rs.rows.length);
      if(rs.rows.length > 0){
        return JSON.parse(rs.rows[0][0]);
      } else {
        return undefined;
      }
    });
  },



  /**
   * Get the value for a key

   var secrets = Ext.space.SecureLocalStore.get('secrets');

   secrets.set('myKey',object).then(function(){
            //do something when done.
        });



   * @param {String} key  The key to store the value at.
   * @param {Object} value The JSON object to store.
   * @return {Ext.space.Promise} the promise that will resolve when the value is stored.
   *
   */
  set: function(key, value){
    return this.query("INSERT OR REPLACE into item values(?,?,?)", [this.name, key, JSON.stringify(value)]).then(function(rs){
      if(rs.value){
        return rs.value;
      } else {
        return undefined;
      }
    });
  },

  /**
   * Checks to see if key is present in collection without fetching and de-serializing the value.

   var secrets = Ext.space.SecureLocalStore.get('secrets');

   secrets.has('myKey').then(function(hasKey){

        });

   * @param {String} key  The key to get a value for.
   * @return {Ext.space.Promise} the promise that will resolve when the value is checked.
   *
   */
  has: function(key){
    return this.query("select count(*) from item where collection = ? and name = ?", [this.name, key]).then(function(rs){
      Ext.space.Logger.debug("value ", rs.rows.length );
      return (rs.rows[0][0] > 0);
    });
  },

  /**
   * Deletes the key if present in collection.

   var secrets = Ext.space.SecureLocalStore.get('secrets');

   secrets.remove('myKey').then(function(done){

        });

   * @param {String} key The key to delete
   * @return {Ext.space.Promise} the promise that will resolve when the value is checked.
   *
   */
  remove: function(key){
    return this.query("delete from item where collection = ? and name = ?", [this.name, key]).then(function(rs){
      Ext.space.Logger.debug("value ", rs.rowsAffected);
      return (rs.rowsAffected > 0);
    });
  },

  /**
   * Alias for .remove()
   *
   * @private
   * @return {Ext.space.Promise} the promise that will resolve when the value is checked
   */
  delete: function(key) {
    return this.remove.apply(this, arguments);
  },


  /**
   * Gets an array of all the keys in a collection

   var secrets = Ext.space.SecureLocalStore.get('secrets');

   secrets.keys().then(function(keys){
           Ext.space.Logger.log(keys.length);
        });

   * @return {Ext.space.Promise} the promise that will resolve when all of the keys have been collected.
   *
   */
  keys: function() {
    return this.query("select name from item where collection = ?", [this.name]).then(function(rs){
      var results = [];
      for(var i =0, l = rs.rows.length; i < l; i++ ){
        results.push(rs.rows[i][0]);
      }
      return results;
    });
  },

  /**
   * Iterates over all the items in a collection

   var secrets = Ext.space.SecureLocalStore.get('secrets');

   secrets.forEach(function(key, value){}).then(function(){
            // done.
        });


   * @param {Function}  callback this function will be called once for each item in the collection.
   * @return {Ext.space.Promise} the promise that will resolve when all of the itmes have been iterated.
   *
   */
  forEach: function(callback) {
    return this.query("select name, value from item where collection = ?", [this.name]).then(function(rs){
      for(var i =0, l = rs.rows.length; i < l; i++ ){
        callback(rs.rows[i][0], JSON.parse(rs.rows[i][1]));
      }
    });
  },

  /**
   * Returns a count of the total number of items in the collection

   var secrets = Ext.space.SecureLocalStore.get('secrets');

   secrets.count().then(function(count){
            // done.
        });

   * @return {Ext.space.Promise} the promise that will resolve with a the number of items in the collection.
   *
   */
  count: function() {
    return this.query("select count(*) from item where collection = ?", [this.name]).then(function(rs){
      Ext.space.Logger.debug("value ", rs.rows[0][0]);
      return parseInt(rs.rows[0][0], 10);
    });
  },

  /**
   * Deletes all of the items in a collection.

   var secrets = Ext.space.SecureLocalStore.get('secrets');

   secrets.clear().then(function(){
            // done.
        });

   * @return {Ext.space.Promise} the promise that will resolve with a the number of items in the collection.
   *
   */
  clear: function(){
    return this.query("DELETE FROM item where collection = ?", [this.name]);
  }
});

/**

 Secure Local Storage is a key value store modeled around html5 localstoage.

 The key differences from localstrorage are:

 - Uses an Asynchronous api based on Ext.space.Promise
 - Each application can more than one named collection of keys or easier data storage
 - All data is encrypted before being persisted to disk
 - The storage limits for SecureLocalStorage are much higher than the 2-3mb allocated for localstorage.


 var secrets = Ext.space.SecureLocalStorage.get('secrets');

 secrets.set('myKey',object).then(function(){
            //do something when done.
        });

 secrets.get('myKey').then(function(object){
            var a = object.field;
        });

 secrets.remove().then(function(isDeleted){
            // done.
        });

 secrets.has(key).then(function(hasKey){

        });

 secrets.forEach(function(key, value){}).then(function(){
            // done.
        });

 secrets.count().then(function(numberOfItems){

        });

 secrets.clear().then(function(){
            // done.
        });

 */
Ext.define("Ext.space.SecureLocalStorage", {
  singleton: true,

  /**
   * @private
   */
  _collections: null,

  /**
   * @private
   */
  constructor: function() {
    this._collections = {};
    this.loaded = new Ext.space.Promise();
  },

  /**
   * Get a collection of name. Collections are automatically created if they do not exist.
   *
   * @param {String} collectionName The name of the collection to get.
   * @return {Ext.space.localstorage.Collection} the secure collection.
   *
   */
  get: function(name) {
    this.load();
    var collection = this._collections[name];
    if (!collection) {
      collection = new Ext.space.localstorage.Collection(name, this.loaded);
      this._collections[name] = collection;
    }
    return collection;
  },

  /**
   * @private
   */
  load: function() {
    var me = this,
      loaded = me.loaded;

    if (me.db) {
      return;
    }

    Ext.onSpaceReady().then(function() {
      var lsdb = new Ext.space.securesql.Database({
        name: "sencha_secure_local_store",
        displayName: "Secure Local Storage",
        skipVersionTracking: true
      });

      lsdb.loaded.then(function(db) {
        me.db = db;

        var transaction = db.createTransaction();
        transaction.sql("CREATE TABLE IF NOT EXISTS item (collection TEXT, name TEXT, value TEXT, PRIMARY KEY (collection, name))");
        transaction.sql("CREATE INDEX IF NOT EXISTS name_idx on item (name)");
        transaction.sql("CREATE INDEX IF NOT EXISTS collection_idx on item (collection)");

        return transaction.execute().then(function() {
          loaded.fulfill(me.db);
        });
      });
    }).error(function(e) {
      loaded.reject(e);
    });

    return loaded;
  }
});

/**
 * SecureSql Database.
 * This class should not be created directly but instead should be obtained via
 * `Ext.space.SecureSql.get`
 *
 */
Ext.define("Ext.space.securesql.Database", {

  /**
   * @type {String}
   * Database name
   */
  name: null,

  /**
   * @type {String}
   * Database display name
   */
  displayName: null,

  /**
   * @type {Number}
   * @private
   * Database ID
   */
  id: -1,

  /**
   * @type {version}
   * @private
   * Database version
   */
  version: -1,

  /**
   * @type {String}
   * Database version table name
   * @private
   */
  versionTable: null,

  /**
   * @type {Number}
   * Current version of the schema
   */
  loadedVersion: -1,

  /**
   * @type {Ext.space.Promise}
   * Promise that fulfills once the database is initialized.
   * @private
   */
  loaded: null,

  /**
   * @type {Ext.space.Promise}
   * The most recent transaction promise to have been queued for execution.
   * @private
   */
  _lastTransaction: null,

  /**
   * @type {Function}
   * Callback function that runs when the database is dropped or closed
   * @private
   */
  _cleanup: null,

  /**
   * @type {Boolean}
   * True if the database has been dropped or closed, in which case object methods will no longer work
   * @private
   */
  _expired: false,

  /**
   * @private
   * @param {Object} options Database configuration options
   * @param {String} options.name Database name
   * @param {String} options.displayName (optional) Database display name
   * @param {Boolean} options.skipVersionTracking (optional) Set to true to skip
   *                                              creating the schema version table
   * @param {Function} options.cleanup (optional) Function to run after the database
   *                                   is either dropped or closed
   */
  constructor: function(options) {
    this.name = options.name;
    this.displayName = options.displayName || options.name;
    this._cleanup = options.cleanup;
    this.versionTable = "_sencha_schema_version";
    this.loaded = new Ext.space.Promise();

    //Don't execute queries until we have loaded/upgraded the schema.
    this.schemaLoaded = new Ext.space.Promise();
    this.hasLoadedSchema = false;

    // initialize the transaction promise queue with our 'loaded' promise
    this._lastTransaction = this.loaded;

    var me = this;
    Ext.onSpaceReady().then(function() {
      Ext.space.Logger.debug("Open database");
      var config = {name: me.name};
      if (me.displayName) { config.displayName = me.displayName; }
      return Ext.space.SecureSql._open(config);
    }).then(function(dbSpec) {
      me.id = dbSpec.id;
      Ext.space.Logger.debug("Create database finished.", me.id);
      if (!(options.hasOwnProperty("skipVersionTracking") && options.skipVersionTracking)) {
        //Create schema version tracking table;
        var transaction = new Ext.space.securesql.Transaction(me, {immediate: true});
        transaction.sql(
            "CREATE TABLE IF NOT EXISTS " + me.versionTable + " " +
            "(" +
            "id INT, " +
            "version INT, " +
            "created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
            "modified_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
            "PRIMARY KEY (id)" +
            ")"
        );
        transaction.sql("SELECT VERSION FROM " + me.versionTable, []).then(function(results) {
          Ext.space.Logger.debug("Found db version raw", results);
          if (results.rows.length > 0) {
            me.loadedVersion = parseInt(results.rows[0][0]);
            Ext.space.Logger.debug("me.loadedVersion", me.loadedVersion);
          }
        });
        return transaction.execute().then(function() {
          Ext.space.Logger.debug("setup transaction complete.");
          me.loaded.fulfill(me);
        }).error(function(e) {
          Ext.space.Logger.error("TX error?", e);
        });
      } else {
        me.loaded.fulfill(me);
      }
    }).error(function(e) {
      me.loaded.reject(e);
    });
  },

  /**
   *
   */
  createSchema: function(version, callback){
    version = parseInt(version);

    var schemaReady = new Ext.space.Promise();
    if (this._expired) {
      schemaReady.reject("Cannot call createSchema; object is expired");
      return schemaReady;
    }

    // TODO should only be called once, need error condition otherwise

    //create TX, callback, run TX.
    this.loaded.then(function(me) {
      Ext.space.Logger.info("Loaded Version", me.loadedVersion, version);
      if (me.loadedVersion === version) {
        //already done!
        schemaReady.fulfill();
        return;
      } else if (me.loadedVersion >= 0 && me.loadedVersion < version) {
        //Run migrations!
        return;
      }

      var tx = me.createTransaction();
      try {
        callback(tx);
        me._setVersion(tx, version);
        tx.execute().connect(schemaReady);
      } catch(e) {
        Ext.space.Logger.error("Error calling callback", e);
        schemaReady.reject(e);
        throw e;
      }
    });
    return schemaReady;
  },

  /**
   *
   *
   */
  migration: function(toVersion, callback){
    // If the user has a version that does not match version specified by
    // createSchema then the migrations are run in order until the version number
    // matches. It is up to the developer to implement correct migrations. TX is
    // passed in, and automatically executed after migration callback function

    // db.migration(version, function(tx){
    //     tx.query();
    //     tx.query();
    //     tx.query();
    // }).then;
  },

  /**
   * @private
   */
  _setVersion: function(transaction, versionNumber){
    var me = this;
    var sql = "INSERT OR REPLACE INTO " + this.versionTable + " " +
      "(id, version, modified_dt)" +
      " VALUES " +
      "(?, ?, datetime())";
    transaction.query(sql, [1, versionNumber]).then(function() {
      me.loadedVersion = versionNumber;
    });
  },

  /**
   * Do any necessary cleanup and mark the object as expired (i.e., any
   * promise-returning methods will immediately reject).
   *
   * @private
   */
  _expire: function() {
    if (this._cleanup) {
      this._cleanup(this);
      this._cleanup = null;
    }
    this._expired = true;
  },

  /**
   * @private
   */
  queueTransaction: function(transaction, transactionComplete) {
    // Since we currently cannot run nested or concurrent transactions, we need
    // a way to serialize their execution. So, we continually track the most
    // recently-queued transaction, setting it up to execute as soon as the one
    // prior to it finishes. When a transaction is queued, we use it to replace
    // the existing most-recently-queued transaction, and the cycle can repeat.

    // Note that this is uglier than the "proper" Promise-based solution because
    // we're breaking the promise chain by manually creating our own stepPromise
    // here. That's intentional, because we don't want to propagate errors into
    // independent transactions.
    var stepPromise = new Ext.space.Promise();
    function next() {
      function step() {
        stepPromise.fulfill();
      }
      transaction.run();
      transactionComplete.then(step, step);
      return stepPromise;
    }
    this._lastTransaction = this._lastTransaction.then(next, next);
  },

  /**
   * Execute a query against the database in a single transaction.
   *
   * The returned promise will return an array of records that match the query.
   * Each array value will be an object, the object properties will match field
   * names in the query. If the query uses column aliases then the alias will be
   * returned as the field name.
   *
   *      testDatabase.query("select id, name from " + TEST_TABLE1 + " where id = ?",[1]).then(function(rows){
     *          var row = rows[0];
     *          Ext.space.Logger.log("record ",row.id, row.name);
     *      }).error(function(e){
     *          Ext.space.Logger.error("Error with query?",e);
     *      });
   *
   *
   *      testDatabase.query("select count(*) as countOfTest from test").then(function(rows){
     *          var row = rows[0];
     *          Ext.space.Logger.log("Count of rows in test ", row.countOfTest);
     *      }).error(function(e){
     *          Ext.space.Logger.error("Error with query?",e);
     *      });
   *
   * @param {String} query The SQL statement
   * @param {Array} fields The fields of the statement.
   * @return {Ext.space.Promise} promise that will resolve when the query completes
   *
   *
   */
  query: function(query, params) {
    var rs = new Ext.space.Promise();
    var me = this;

    if (this._expired) {
      rs.reject("Cannot run queries; object is expired");
      return rs;
    }

    Ext.space.Logger.debug("Query, tx start", query, params);
    var transaction = this.createTransaction();
    transaction.sql(query, params).then(function(results) {
      var insertId = results.insertId; // store here because convertResults will lose it
      results = me.convertResults(results);
      rs.fulfill(results, insertId);
    }).error(function(e) {
      rs.reject(e);
    });

    transaction.execute();

    return rs;
  },

  /**
   * Generate a list of tables in the current database.
   *
   * @return {Ext.space.Promise} Promise that resolves with an array of table names.
   */
  listTables: function() {
    return this.query("SELECT * FROM sqlite_master WHERE type='table';").then(function(tables) {
      return tables.map(function(table) {
        return table.name;
      });
    });
  },

  /**
   * Convert results from a normal SQLite result set to a JavaScript array.
   * @private
   * @param {Object} results SQLite result set
   * @return {Array} array-ified result set
   */
  convertResults: function(results){
    var converted = [];

    var fields = results.names;
    var numFields = fields.length;
    var rows = results.rows;

    for (var i=0, l=rows.length; i<l; i++) {
      var row = rows[i];
      var obj = {};
      for (var j=0; j<numFields; j++ ) {
        obj[fields[j]] = row[j];
      }
      converted.push(obj);
    }

    return converted;
  },

  /**
   * Insert a single record into a table.
   *
   * You can pass either an array or object into this function:
   * - If an array then the order of elements in the array must match the order of
   *   the fields.
   * - If an object then the field names will be extracted from the properties
   *
   * Array Example:
   *
   *      testDatabase.insert('test', ["id", "name"], [1, "one"]).then(function(insertId){
     *          //done with insert
     *          //insertId will be 1 or the auto increment value of the id of the table if the table has one.
     *      }).error(function(e){
     *          Ext.space.Logger.error("Error with insert",e);
     *      });
   *
   * would be equivalent to
   *
   *      INSERT INTO TABLE test (id, name) VALUES (1, 'one');
   *
   *  Object Example:
   *
   *      testDatabase.insert('test', ["id", "name"], {id: 2, name:"two"}).then(function() {
     *          //done with insert
     *          //insertId will be 2 or the auto increment value of the id of the table if the table has one.
     *      }).error(function(e) {
     *          Ext.space.Logger.error("Error with insert",e);
     *      });
   *
   *  would be equivalent to
   *
   *      INSERT INTO TABLE test (id, name) VALUES (2, 'two');
   *
   * @param {String} table  the name of the table the record will be inserted into
   * @param {Array} fields  an array of field names to insert.
   * @param {Array|Object} values  either an array or object to insert.
   * @return {Ext.space.Promise} promise that will resolve when the insert is complete.
   *
   */
  insert: function(table, fields, values){
    var q = this._buildInsertStatement(table, fields, values);
    return this.query(q.statement, q.values).then(function(results, insertId){
      return insertId;
    });
  },

  /**
   * @private
   */
  _buildInsertStatement: function(table, fields, values){
    var statement = "INSERT INTO " + table + "(" + fields.join(",") + ")";
    var v = [];
    var vals = [];
    var isArray = Array.isArray(values);

    for(var i = 0, l = fields.length; i<l; i++){
      v.push("?");
      vals[i] = isArray ? values[i] : values[fields[i]];
    }
    statement += " VALUES (" + v.join(",") + ")";
    return {statement: statement, values: vals};
  },


  /**
   * Insert a multiple records in a single transaction into a table. Either an
   * array of arrays or objects can be passed into this function
   * - If an array then the order of elements in the array must match the order of
   *   the fields.
   * - If an object then the field names will be extracted from the prop
   *
   * Because this is a transaction either all of inserts will be inserted or no
   * records will be inserted. In the event of a failure the promise will reject
   * with the sql statement that caused the error.
   *
   * Insert 500 records in a single transaction:
   *
   *      var records = [];
   *      for(var i = 1, l = 500; i <= l; i++){
     *          records.push([i, "row "+ i]);
     *      }
   *
   *      testDatabase.insertMany(TEST_TABLE1, ["id", "name"], records).then(function() {
     *          //Insert complete.
     *      }).error(function(e) {
     *          Ext.space.Logger.error("Error with insert",e);
     *      });
   *
   * @param {String} table the name of the table the record will be inserted into
   * @param {Array} fields an array of field names to insert.
   * @param {Array} values An array of either arrays or objects to insert.
   * @return {Ext.space.Promise} promise that will resolve when the insert is complete.
   */
  insertMany: function(table, fields, values){
    if (this._expired) {
      var nope = new Ext.space.Promise();
      nope.reject("Cannot run queries; object is expired");
      return nope;
    }

    Ext.space.Logger.debug("insert many tx start");
    var transaction = this.createTransaction();
    for (var r=0; r<values.length; r++) {
      var q = this._buildInsertStatement(table, fields, values[r]);
      transaction.sql(q.statement, q.values);
    }
    return transaction.execute();
  },

  /**
   * Creates a new Transaction.
   *
   * Add queries, then execute them in a single database transaction.
   *
   *      var tx = testDatabase.createTransaction();
   *      tx.query("select * from test where id = ?",[2]).then(function(rows) {
     *          // statement done
     *      }).error(function(e) {
     *          Ext.space.Logger.error("Error with query?",e);
     *      });
   *
   *      tx.query("select * from test where id = ?",[1]).then(function(rows) {
     *          // statement done
     *      }).error(function(e) {
     *          Ext.space.Logger.error("Error with query?",e);
     *      });
   *
   *      tx.execute().then(function() {
     *          // transaction done
     *      }).error(function(e) {
     *          Ext.space.Logger.error("Error with TX?",e);
     *      });
   *
   * @return {Ext.space.securesql.Transaction} Transaction object, or null if the
   *                                           database has been closed or dropped
   */
  createTransaction: function(){
    if (this._expired) {
      Ext.space.Logger.warn("Cannot create a transaction on an expired database", this);
      return null;
    }
    return new Ext.space.securesql.Transaction(this);
  },


  /**
   * Permanently delete this database. This operation cannot be undone. All data
   * in this database will be lost.
   *
   * @return  {Ext.space.Promise} promise that will resolve when the db has been deleted.
   */
  drop: function(){
    var promise = new Ext.space.Promise();

    this.loaded.then(function(me) {
      Ext.space.Communicator.send({
        command: "Sqlite#dropDatabase",
        databaseId: me.id,
        callbacks: {
          success: function(results) {
            me._expire();
            promise.fulfill(results);
          },
          failure: function(e) {
            promise.reject(e);
          }
        }
      });
    });

    return promise;
  },


  /**
   * Close this database.
   *
   * @return  {Ext.space.Promise} promise that will resolve when the db has been closed.
   */
  close: function(){
    var promise = new Ext.space.Promise();

    if (this._expired) {
      promise.reject("Cannot close database; object is expired");
      return promise;
    }

    this.loaded.then(function(me) {
      Ext.space.Communicator.send({
        command: "Sqlite#closeDatabase",
        databaseId: me.id,
        callbacks: {
          onSuccess: function() {
            me._expire();
            promise.fulfill();
          },
          onError: function(e) {
            promise.reject(e);
          }
        }
      });
    });

    return promise;
  },


  /**
   * Import data from the file system into the database. The data can either be
   * in CSV (or similar) format, or in the form of a script full of SQL statements.
   *
   * @param {Number} fileKey File key of the file from which to import data
   * @param {String} type "csv" for delimited text records
   * @param {String} tableName Name of the database table to populate (for CSV)
   * @param {Array} fields Array of string names of the columns in the file (for CSV)
   * @param {String} delimiter (optional) Field delimiter (for CSV), defaults to ","
   * @param {Function} progressCallback (optional) Callback function to execute as the import process proceeds; will be passed a single parameter: the number of rows inserted
   * @param {Number} progressCount (optional) Interval in milliseconds at which to call the progressCallback
   *
   */
  importData: function(fileKey, type, tableName, fields, delimiter, progressCallback, progressCount) {
    var promise = new Ext.space.Promise();

    if (this._expired) {
      promise.reject("Cannot import data; object is expired");
      return promise;
    }

    this.loaded.then(function(me) {
      Ext.space.Communicator.send({
        command: "Sqlite#importData",
        databaseId: me.id,
        file: fileKey,
        progressInterval: progressCallback ? (progressCount || 5000) : undefined,
        delimiter: delimiter,
        type: type,
        fields: fields,
        table: tableName,
        callbacks: {
          onComplete: function(results) {
            promise.fulfill(results);
          },
          onError: function(e) {
            promise.reject(e);
          },
          onProgress: function(imported){
            Ext.space.Logger.info("Rows", imported);
            if(progressCallback && imported.rowsInserted){
              progressCallback(imported.rowsInserted);
            }
          }
        }
      });
    });
    return promise;
  }
});

/**
 *
 * A SecureSQL database transaction. See `Ext.space.securesql.Database.createTransaction`
 *
 * Queries added to a transaction will be executed as part of a single transaction.
 * Each query returns a promise with the data for the query. The `execute` statement
 * returns a promise that will resolve when the transaction is complete.
 *
 * If any of the queries generate an error then the transaction will be rolled back
 * and any data mutations will not be applied to the database.

 * The promise of the query that failed will reject. And the promise returned by
 * `execute` will also reject.
 *
 *      var tx = testDatabase.createTransaction();
 *
 *      tx.query("select * from test where id = ?",[2]).then(function(rows){
 *          //
 *      }).error(function(e){
 *          Ext.space.Logger.error("Error with query?",e);
 *      });
 *
 *      tx.query("select * from test where id = ?",[1]).then(function(rows){
 *          //
 *      }).error(function(e){
 *          Ext.space.Logger.error("Error with query?",e);
 *      });
 *
 *      tx.execute().then(function(){
 *          //
 *      }).error(function(e){
 *          Ext.space.Logger.error("Error with TX?",e);
 *      });
 */
Ext.define("Ext.space.securesql.Transaction", {

  /**
   * @private
   */
  database: null,

  /**
   * @private
   */
  queries: null,

  /**
   * @private
   */
  id: null,

  /**
   * @private
   */
  began: false,

  /**
   * @private
   */
  skipDatabaseLoaded: false,

  /**
   * @private
   */
  executePromise: null,

  constructor: function(database, options) {
    this.database = database;
    this.queries = [];
    // allow for moving ahead even if the database hasn't declared itself to
    // be loaded (because in order to load it, we have to create a version table,
    // so we need a transaction first in an unfortunate chicken and egg scenario)
    if (options && options.immediate) {
      this.skipDatabaseLoaded = true;
    }
  },

  /**
   * Add a query this transaction.
   *
   * The returned promise will provide an array of records that match the query.
   * Each array value will be an object; the object properties will match field
   * names in the query. If the query uses column aliases then the alias will be
   * returned as the field name.
   *
   *      testDatabase.query("select id, name from test where id = ?",[1]).then(function(rows) {
     *          var row = rows[0];
     *          Ext.space.Logger.log("record ",row.id, row.name);
     *      }).error(function(e) {
     *          Ext.space.Logger.error("Error with query?",e);
     *      });
   *
   *      testDatabase.query("select count(*) as countOfTest from test").then(function(rows) {
     *          var row = rows[0];
     *          Ext.space.Logger.log("Count of rows in test ", row.countOfTest);
     *      }).error(function(e) {
     *          Ext.space.Logger.error("Error with query?",e);
     *      });
   *
   * @param {String} query The SQL statement
   * @param {Array} fields The fields of the statement.
   * @return {Ext.space.Promise} promise that will resolve when the query completes
   */
  query: function(statement, values){
    if (this.began) {
      throw new Error("Ext.space.securesql.Transaction#query: Cannot add queries to a transaction that has already begun.");
    }
    var me = this;
    return this.sql(statement, values).then(function(rs){
      return me.database.convertResults(rs);
    });
  },

  /**
   * Insert a single record into a table. Pass this function an array or object:
   * - If an array, then the order of elements in the array must match the order
   *   of the fields.
   * - If an object, then the field names will be extracted from the properties
   *
   * Array Example:
   *
   *      tx.insert('test', ["id", "name"], [1, "one"]).then(function(insertId) {
     *          //done with insert
     *          //insertId will be 1 or the auto increment value of the id of the table if the table has one.
     *      }).error(function(e) {
     *          Ext.space.Logger.error("Error with insert",e);
     *      });
   *
   *  would be equivalent to
   *
   *      INSERT INTO TABLE test (id, name) VALUES (1, 'one');
   *
   *  Object Example:
   *
   *      tx.insert('test', ["id", "name"], {id: 2, name:"two"}).then(function() {
     *          //done with insert
     *          //insertId will be 2 or the auto increment value of the id of the table if the table has one.
     *      }).error(function(e) {
     *          Ext.space.Logger.error("Error with insert",e);
     *      });
   *
   *  would be equivalent to
   *
   *      INSERT INTO TABLE test (id, name) VALUES (2, 'two');
   *
   * @param {String} table the name of the table the record will be inserted into
   * @param {Array} fields an array of field names to insert.
   * @param {Array|Object} values  either an array or object to insert.
   * @return  {Ext.space.Promise} promise that will resolve when the insert is complete.
   */
  insert: function(table, fields, values){
    if (this.began) {
      throw new Error("Ext.space.securesql.Transaction#insert: Cannot add queries to a transaction that has already begun.");
    }
    var query = this.database._buildInsertStatement(table, fields, values);
    return this.sql(query.statement, query.values).then(function(rs){
      return rs.insertId;
    });
  },

  /**
   * Execute the queries in the transaction.
   *
   * @return  {Ext.space.Promise} Promise that resolves if all the queries are successful
   *                        or rejects if any query fails.
   */
  execute: function() {
    if (!this.executePromise) {
      this.executePromise = new Ext.space.Promise();
      if (this.skipDatabaseLoaded) {
        this.run();
      } else {
        this.database.queueTransaction(this, this.executePromise);
      }
    }
    return this.executePromise;
  },



  //
  // private native bridge interface methods follow
  //

  /**
   * Add a raw SQL statement to this transaction.
   *
   * This differs from `query()` in that it will not do any processing on the
   * results returned by the query.
   *
   * @private
   * @param {String} sql The SQL statement to execute. This is required.
   * @param {Array} args The arguments array to bind each "?" placeholder in the Sql statement. This is optional.
   * @return {Ext.space.Promise} The promise that is resolved when the SQL statement has finished executing.
   */
  sql: function(statement, args) {
    if (this.began) {
      throw new Error("Ext.space.securesql.Transaction#sql: Cannot add SQL queries to a transaction that has already begun.");
    }
    var queryPromise = new Ext.space.Promise();
    this.queries.push({statement: statement, values: args, promise: queryPromise});
    return queryPromise;
  },

  /**
   * Create the transaction in the native client.
   *
   * @param {Object} config Transaction options
   * @param {Boolean} config.readOnly `true` if this is a read-only transaction
   * @return {Ext.space.Promise} Promise that resolves when the transaction is created.
   */
  create: function(config) {
    config = config || {};
    var promise = new Ext.space.Promise(),
      me = this;

    Ext.space.Communicator.send({
      command: "Sqlite#createTransaction",
      databaseId: me.database.id,
      readOnly: config.readOnly,
      queue: true,
      callbacks: {
        success: function(id) {
          me.id = id;
          promise.fulfill();
        },
        failure: function(e) {
          promise.reject(e);
        }
      }
    });

    return promise;
  },

  /**
   * Begin executing the transaction.
   *
   * @private
   * @return {Ext.space.Promise} Promise that resolves when the transaction is ready to begin executing SQL queries.
   */
  begin: function() {
    var me = this,
      promise = new Ext.space.Promise();

    if (!me.began) {
      me.began = true;
      Ext.space.Communicator.send({
        command: "Sqlite#beginTransaction",
        transactionId: me.id,
        callbacks: {
          success: function() {
            promise.fulfill();
          },
          failure: function(e) {
            promise.reject(e);
            me.rollback(e);
          }
        }
      });
    } else {
      promise.reject("Ext.space.securesql.Transaction#begin: Cannot begin a transaction that has already been started");
    }

    return promise;
  },

  /**
   * Execute the SQL statements in this transaction in sequence.
   *
   * @private
   */
  executeStatements: function() {
    var me = this;

    function next(query) {
      if (!query) {
        me.commit();
        return;
      }

      Ext.space.Communicator.send({
        command: "Sqlite#executeStatement",
        transactionId: me.id,
        sqlStatement: query.statement,
        arguments: JSON.stringify(query.values),
        callbacks: {
          success: function(rs) {
            // Protect against a DB deadlock in case promise handler throws an exception.
            try {
              query.promise.fulfill(rs);
              next(me.queries.shift());
            } catch(e) {
              try {
                query.promise.reject(e);
              } catch(ex) {
                // no-op
              }
              me.rollback(e);
            }
          },
          failure: function(e) {
            // Protect against a DB deadlock in case promise handler throws an exception.
            try {
              query.promise.reject(e);
            } catch(ex) {
              // no-op
            }
            me.rollback(e);
          }
        }
      });
    }

    next(me.queries.shift());
  },

  /**
   * Commit the transaction.
   *
   * @private
   */
  commit: function() {
    var me = this;
    Ext.space.Communicator.send({
      command: "Sqlite#commitTransaction",
      transactionId: me.id,
      callbacks: {
        success: function() {
          me.executePromise.fulfill();
        },
        failure: function() {
          me.rollback();
        }
      }
    });
  },

  /**
   * Roll back the transaction
   *
   * @private
   */
  rollback: function(e) {
    Ext.space.Communicator.send({
      command: "Sqlite#rollbackTransaction",
      transactionId: this.id
    });

    this.executePromise.reject(e);
  },

  /**
   * Batch executes all queued Sql statements inside a transaction, handling errors and commit/rollback automatically.
   *
   * @private
   * @return {Ext.space.Promise}
   * The promise that is resolved when the transaction has been committed or rolled back.
   */
  run: function() {
    var start,
      create = this.create.bind(this),
      begin = this.begin.bind(this),
      executeStatements = this.executeStatements.bind(this);

    if (this.skipDatabaseLoaded) {
      start = create();
    } else {
      start = this.database.loaded.then(function() { return create(); });
    }
    return start.then(begin).then(executeStatements);
  }
});

/**

 SecureSql is the javascript interface to Sencha Web Application Client's encrypted
 SQL database. SecureSql uses an encrypted form of SQLite 3. Please see
 http://sqlite.org/ for more details on the subset of SQL that sqlite supports.


 Basic Usage
 ----

 Open a connection to the database. An application can have as many named databases as
 needed. Each database is independent of the other databases in the application.

 var db = Ext.space.SecureSql.get("test");

 Schema
 ----

 Next you will need to define a schema in the database. Each version of the database
 should have a version number. When the database is ready to create tables and
 indexes, the callback function will be called with a
 `Ext.space.securesql.Transaction`. Add queries to create the tables and indexes
 needed for this database.

 db.createSechema(1, function(tx){
            tx.query("CREATE TABLE IF NOT EXISTS test (id int, name text,  PRIMARY KEY (id))");
            tx.query("CREATE TABLE IF NOT EXISTS person (id int, firstName text,lastName text, email text, PRIMARY KEY (id))");
        });

 Do not run the transaction from within the callback. It will be executed
 automatically after the callback function returns.

 The callback on createSchema is only called if a database of that version does not
 already exist.  If the schema of the application's database changes overtime then the
 data will need to be migrated.  See the Migration section below.

 See `Ext.space.securesql.Database.createSchema` for more details.

 Inserting Data
 ----

 SecureSql provides two convenience methods for inserting data into the database. The
 application can pass either an array of data or a javascript object.

 * `Ext.space.securesql.Database.insert` will insert record into a table using a single
 transaction.
 * `Ext.space.securesql.Database.insertMany` will insert multiple records into a table
 single transaction.



 Queries
 ----

 `Ext.space.securesql.Database.query` will execute a query against the database in a
 single transaction.


 Transactions
 ----

 SecureSql supports executing multiple inserts and queries in a single logical
 transaction

 var tx = Ext.space.securesql.Database.createTransaction()

 tx.query()
 tx.insert()
 tx.query()
 tx.query()
 tx.execute()

 see `Ext.space.securesql.Database.createTransaction`


 Data Migration
 ----
 SecureSql provides methods to migrate a schema from one version to the next. Data
 migrations can become complex so we recommend modification the database as little as
 possible after the initial creation.

 If the application loads and createSechema attempts to create version 3 of the schema

 db.createSchema(3, function(tx){
            //....
        });

 1) if this client does not have a database then createSchema executes and the schema
 version is set to 3
 2) if the client already has schema version 3 then nothing happens, and queries will
 be executed.
 3) if the schema version is less that 3 then each of the registered migration
 callbacks are executed until the version is equal to the version defined in
 createSchema

 It is the responsibility of the developer to ensure that the table mutation
 operations in the migration callbacks will correctly update the database to the
 current schema.

 IF the developer has defined version 3 of createSchema then they should define two
 version migrations.

 This migration will upgrade version 1 of the database to version 2.

 db.migrate(2, function(tx){
            //....
        });

 This migration will upgrade version 2 to version 3:

 db.migrate(3, function(tx){
            //....
        });

 Database List
 ----

 If you need to programmatically determine what databases are available, call the
 `listDatabases` API:

 Ext.space.SecureSql.listDatabases().then(function(databaseList) {
        databaseList.forEach(function(db) {
            // db.name, db.version, etc...
        });
    });

 */

Ext.define("Ext.space.SecureSql", {
  singleton: true,

  /*
   * @private
   */
  _openDBs: null,

  /*
   * @private
   */
  constructor: function() {
    this._openDBs = {};
  },

  /**
   * List the available databases.
   *
   * @return {Ext.space.Promise} Promise which receives an array of database info objects
   *                       like {name, displayName}
   */
  listDatabases: function() {
    var result = new Ext.space.Promise();
    Ext.space.Communicator.send({
      command: "Sqlite#listDatabases",
      callbacks: {
        onSuccess: function(databaseList) {
          result.fulfill(databaseList.map(function(db) {
            return {
              name: db.name,
              displayName: db.displayName
            };
          }));
        },
        onError: function(error) {
          result.reject(error);
        }
      }
    });
    return result;
  },

  /**
   *
   * Open a connection to a database. A database will automatically be created if it does not already exist.
   *
   * @param {String} name The name of the database to open.
   * @return {Ext.space.securesql.Database} the secure collection.
   */
  get: function(name) {
    function release(database) {
      Ext.space.Logger.debug("releasing DB: " + name);
      if (this._openDBs[database.name]) {
        delete this._openDBs[database.name];
      }
    }

    var db = this._openDBs[name];
    Ext.space.Logger.info("Get database", name, db);
    if (!db) {
      db = new Ext.space.securesql.Database({name: name, cleanup: release.bind(this)});
      this._openDBs[name] = db;
    }
    return db;
  },

  /**
   * Permanently delete this database. This operation cannot be undone. All data in
   * this database will be lost.
   *
   * @param {String} name The name of the database to delete.
   * @return {Ext.space.Promise} a promise that will resolve when the database has been removed.
   */
  drop: function(name) {
    var db = this._openDBs[name];
    return db ? db.drop() : this.get(name).drop();
  },

  /**
   * Opens the database with the given name; if it does not exist, it will be created.
   *
   * @private
   * @param {Object} options Database options
   * @param {String} options.name Database name
   * @param {String} options.displayName (optional) Database name for display purposes
   * @return {Ext.space.Promise} The promise that will resolve when the database is opened and returned.
   */
  _open: function(options) {
    var promise = new Ext.space.Promise();

    if (options.name) {
      Ext.space.Communicator.send({
        command: "Sqlite#openDatabase",
        name: options.name,
        displayName: options.displayName || options.name,
        callbacks: {
          success: function(dbSpec) {
            promise.fulfill(dbSpec);
          },
          failure: function(e) {
            promise.reject(e);
          }
        }
      });
    } else {
      promise.reject("Cannot open database; no name specified.");
    }

    return promise;
  }
});

/**
 * Key/Value store for files. Files stored using this API are encrypted automatically
 * using Sencha Web Application Manager's security infrastructure.
 *
 *      var files = Ext.space.SecureFiles.get('secrets');
 *
 *      files.get('myKey').then(function(contents){
 *          // do something with the content of the file.
 *      });
 *
 * files is an instance of Ext.space.files.Collection. See Ext.space.files.Collection for
 * a complete list of file operations.
 *
 * This module also allows you to run queries across all of an application's Collections:
 *
 *      Ext.space.SecureFiles.query({ name: "*.txt" }).then(function(files) {
 *          // got 'em
 *      });
 *
 * @aside guide secure_file_api
 *
 */
Ext.define("Ext.space.SecureFiles", {
  singleton: true,

  /**
   * @private
   * @type {Object}
   */
  collections: null,

  /**
   * @private
   * @type {Array}
   */
  dummyCollections: null,

  /**
   * @private
   */
  constructor: function() {
    this.collections = {};
    this.dummyCollections = [];
  },

  /**
   * Create a function that caches query results in a dummy collection.
   *
   * @private
   * @return {Function} Function that takes a query result and caches it in a dummy
   *                    collection (necessary to run queries without collections
   *                    and still allow various file operations to work correctly)
   */
  _makeDummyCacher: function() {
    var collection = new Ext.space.files.Collection();
    this.dummyCollections.push(collection);
    return collection._cache.bind(collection);
  },

  /**
   * Remove a file from any loaded collections.
   *
   * When a file gets overwritten by some operation, the object in memory needs to
   * be removed from any collections we've loaded; this function traverses through
   * every collection this module is tracking and does just that.
   *
   * @private
   * @param {String} key File key
   */
  _removeFileFromLoadedCollections: function(key) {
    var collections = this.collections, k = key.toString();

    Object.keys(collections).forEach(function(path) {
      if (collections[path].files[k]) {
        delete collections[path].files[k];
      }
    });

    this.dummyCollections.forEach(function(collection) {
      if (collection.files[k]) {
        delete collection.files[k];
      }
    });
  },

  /**
   * Get a collection by name. Collections are automatically created if they do not
   * exist, and multiple requests for collections with the same name will all
   * return the same collection object.
   *
   * @param {String} name The name of the collection to get.
   * @return {Ext.space.files.Collection} the secure collection.
   */
  get: function(name) {
    if (!this.collections.hasOwnProperty(name)) {
      this.collections[name] = new Ext.space.files.Collection(name);
    }
    return this.collections[name];
  },

  /**
   * Create a file from its file Key.
   *  The collection the file belongs to is updated
   *  If the File's Collection is not in memory then it is automatically created.
   *
   * @param {String} key The key of the file on the file system.
   *
   *
   *@private
   */
  getFile: function(key){
    var _self = this;
    var result = new Ext.space.Promise();
    Ext.space.Communicator.send({
      command: "Files#getFile",
      key: key,
      callbacks: {
        onSuccess: function(meta) {
          var collection = _self.get(meta.path);
          var file = collection._cache(meta);
          result.fulfill(file);
        },
        onError: function(error) {
          result.reject(error);
        }
      }
    });
    return result;
  },

  /**
   * Query the application's file system for files that match the given criteria.
   *
   * The `query` is a dictionary with data against which to match files. The fields
   * supported are:
   *
   * * `name`: "exactName.txt", "*.txt", etc...
   * * `type`: MIME type ("text/plain", etc...)
   * * `createdBefore`: Date object
   * * `createdAfter`: Date object
   * * `modifiedBefore`: Date object
   * * `modifiedAfter`: Date object
   *
   * The query will combine the criteria specified and produce an array of matching
   * files. If you omit the query completely, the query operation will return an
   * array of all files in the collection.
   *
   * The `options` is a dictionary describing how you want the results to be presented:
   *
   * * `fetch`: "count" or "data" (the default), to return a simple count, or the
   *   complete results, respectively
   * * `sortField`: name of the field on which to sort
   * * `sortDirection`: "asc" or "desc"
   *
   * @param {Object} query (optional) Query object
   * @param {String} query.name (optional) exactName.txt", "*.txt", etc...
   * @param {String} query.type MIME type ("text/plain", etc...)
   * @param {Date} query.createdBefore (optional) Date object
   * @param {Date} query.createdAfter (optional) Date object
   * @param {Date} query.modifiedBefore (optional) Date object
   * @param {Date} query.modifiedAfter (optional) Date object
   * @param {String} options(optional) modifies how  the results will be returned
   * @param {String} options.fetch  (optional) "count" or "data" (the default), to return a simple count, or the complete results, respectively
   * @param {String} options.sortField  (optional)  name of the field on which to sort
   * @param {String} options.sortDirection  (optional)  "asc" or "desc"
   * @return {Ext.space.Promise} Promise that resolves with the Ext.space.files.File
   *                       objects that match the criteria.
   */
  query: function(query, options) {
    var result = new Ext.space.Promise();
    var qry = {path: "*"}; // default to querying the app's entire file system

    // fetching just a count of results, or the results themselves?
    var fetch = (options && options.fetch && options.fetch.toLowerCase() === "count") ? "count" : "data";

    if (query) {
      // copy the rest of the query as is
      if (query.name) { qry.name = query.name; }
      if (query.type) { qry.type = query.type; }
      if (query.hasOwnProperty("path")) { qry.path = query.path; }

      // convert Date objects to epoch seconds
      if (query.createdBefore) { qry.createdBefore = query.createdBefore.getTime() / 1000; }
      if (query.createdAfter) { qry.createdAfter = query.createdAfter.getTime() / 1000; }
      if (query.modifiedBefore) { qry.modifiedBefore = query.modifiedBefore.getTime() / 1000; }
      if (query.modifiedAfter) { qry.modifiedAfter = query.modifiedAfter.getTime() / 1000; }
    }

    var args = {
      command: "Files#queryFiles",
      query: qry,
      fetch: fetch,
      callbacks: {
        onSuccess: function(matches) {
          var cacheResult;

          // if we're fetching a count, return it directly; if we're fetching
          // data on behalf of a collection, return it directly as well, to
          // allow the collection to decide how to process it; if we're
          // querying across all of an application's collections, then put
          // things in the dummy collection and return what gets stored.
          if (fetch === "count" || (options && options.collection)) {
            result.fulfill(matches);
          } else {
            cacheResult = Ext.space.SecureFiles._makeDummyCacher();
            result.fulfill(matches.map(function(match) {
              return cacheResult(match);
            }));
          }
        },
        onError: function(error) {
          result.reject(error);
        }
      }
    };

    if (options) {
      if (options.sortField) { args.sortField = options.sortField; }
      if (options.sortDirection) { args.sortDirection = options.sortDirection.toLowerCase(); }
    }

    Ext.space.Communicator.send(args);

    return result;
  },

  /**
   * Compress the provided files into an archive.
   *
   *      Ext.space.SecureFiles.compress({
     *          files: arrayOfFileObjects,
     *          archiveName: "somefiles.zip"
     *      }).then(function(file) {
     *          // do something with the archive file
     *      });
   *
   *      // or specify more options:
   *      Ext.space.SecureFiles.compress({
     *          files: arrayOfFileObjects,
     *          archiveName: "somefiles.blob",
     *          path: "myArchivePath",
     *          type: "zip"
     *      }).then(function(file) {
     *          // do something with the archive file
     *      });
   *
   * @param {Object} args Options object
   * @param {Array} files Array of Ext.space.files.File objects to compress into an archive
   * @param {String} archiveName Name of the archive file to create
   * @param {String} path (optional) Path into which to save the archive; defaults to ""
   * @param {String} type (optional) Compression type ("zip", "zip", "bzip2", "rar");
   *                      if this is omitted, the system will attempt to determine
   *                      the compression type from the archiveName, and if it
   *                      cannot be determined, defaults to "zip".
   * @return {Ext.space.Promise} Promise that resolves with the Ext.space.files.File
   *                       object for the new archive.
   */
  compress: function(args) {
    var result = new Ext.space.Promise();

    if (!args) {
      result.reject("Missing compression arguments");

    } else if (!args.files || args.files.length === 0) {
      result.reject("Missing files; cannot create a compressed archive");

    } else if (!args.archiveName) {
      result.reject("Missing compressed archive name");

    } else {
      var getEncoding = this._getCompressionEncodingFromName.bind(this);
      var cmd = {
        command: "Compression#compress",
        keys: args.files.map(function(file) { return file.key; }),
        archiveName: args.archiveName,
        path: args.path || "",
        encoding: args.type || getEncoding(args.archiveName) || "zip",
        callbacks: {
          onSuccess: function(meta) {
            result.fulfill(Ext.space.SecureFiles.get(meta.path)._cache(meta));
          },
          onError: function(error) {
            result.reject(error);
          }
        }
      };
      Ext.space.Communicator.send(cmd);
    }

    return result;
  },

  /**
   * Parse the most likely compression encoding from the given filename.
   *
   * @private
   * @param {String} name File name to parse
   * @return {String} Compression encoding, or "" if unknown
   */
  _getCompressionEncodingFromName: function(name) {
    var idx = name.lastIndexOf(".");
    var ext = name.substr(idx+1).toLowerCase();
    if (idx >= 0) {
      if (ext == "gz" || ext == "gzip") {
        return "gzip";
      } else if (ext == "zip") {
        return "zip";
      } else if (ext == "rar") {
        return "rar";
      } else if (ext == "bz2" || ext == "bzip2") {
        return "bzip2";
      }
    }

    return "";
  }

});

(function(){

// utility function for returning a particular field from the item parameter, or if
// item is a string, the item itself; if neither is valid, return undefined
  function extract(item, field) {
    if (item[field]) {
      return item[field];
    } else if (typeof item == "string" || typeof item == "number") {
      return item;
    }
    // intentionally don't return anything
  }


// utility function for creating a promise and wiring up callbacks if they were
// provided in the args object (i.e., "callback style invocation").
  function promisize(args) {
    var promise = new Ext.space.Promise();

    if (args && (args.onComplete || args.onError)) {
      promise.then(
          typeof args.onComplete == "function" ? args.onComplete : undefined,
          typeof args.onError == "function" ? args.onError : undefined
      );
    }

    return promise;
  }


// utility function to filter out the weird empty items that sometimes come back from
// the native side, that look like they're still in progress, but they're invalid;
  function downloadIsReal(item) {
    return item.isComplete || (!!item.totalBytes && !!item.fileName);
  }


  /**
   * Promise-based API for downloading files via URL.
   *
   * To download a file:
   *
   *      // list some details when the download completes
   *      function onComplete(file, download) {
 *          Ext.space.Logger.log("Download finished: " + download.url);
 *          Ext.space.Logger.log("Download size: " + download.totalBytes);
 *          Ext.space.Logger.log("Saved to: " + download.fileName);
 *          Ext.space.Logger.log("File path: " + file.path);
 *          Ext.space.Logger.log("File name: " + file.name);
 *          Ext.space.Logger.log("File size on disk: " + file.size);
 *      }
   *
   *      Ext.space.Downloads.download({ url: "http://www.sencha.com/" }).then(onComplete);
   *
   * The `download` objects involved here are instances of Ext.space.files.Download;
   * the `file` object is an Ext.space.files.File.
   *
   * To get a list of all downloads currently in progress, plus up to the ten most
   * recently completed downloads:
   *
   *      Ext.space.Downloads.getDownloads().then(function(downloads) {
 *          downloads.forEach(function(download) {
 *              Ext.space.Logger.log(download.fileName);
 *          });
 *      });
   *
   * If you have a download object and want to fetch the latest information about it,
   * you can get the progress of a single download at a time:
   *
   *      download.getProgress().then(function(updatedDownload) {
 *          Ext.space.Logger.log(updatedDownload.bytesDownloaded + " bytes downloaded");
 *      });
   *
   * Alternatively, you can wire up a progress event callback on the download:
   *
   *      download.on("progress", function(updatedDownload) {
 *          // gets called every time new progress is available
 *      });
   *
   * To cancel a download in progress:
   *
   *      download.cancel().then(function() {
 *          Ext.space.Logger.log("Canceled!");
 *      });
   *
   * @aside guide file_locker
   *
   */
  Ext.define("Ext.space.Downloads", {
    singleton: true,

    /**
     * @private
     * Cache of the download information returned by the native bridge
     */
    downloads: null,

    /**
     * @private
     * Whether or not the download manager has registered callbacks with the native bridge DownloadManager#watchDownloads
     */
    watching: false,

    /**
     * @private
     */
    constructor: function() {
      this.downloads = {};
    },

    /**
     * Download a file.
     *
     * Normal usage is to pass in only the URL, and attach callbacks to the returned
     * Promise via .then(...). If you pass callbacks directly, in the args parameter,
     * they are installed as the respective Promise handlers before returning.
     *
     * @param {String|Object} args URL to download, or property bag with .url,
     *                             .onComplete, .onError, .onProgress
     * @return {Ext.space.files.Download} Download object that will be filled with data as it becomes available
     */
    download: function(args) {
      var url, manager = this, download = new Ext.space.files.Download();

      if (args && (args.onComplete || args.onError)) {
        download.then(
            typeof args.onComplete == "function" ? args.onComplete : undefined,
            typeof args.onError == "function" ? args.onError: undefined
        );
      }

      if (args) {
        url = extract(args, "url");

        if (url) {
          if (args.onProgress) {
            download.on("progress", args.onProgress);
          }

          Ext.space.Communicator.send({
            command: "DownloadManager#download",
            url: url,
            callbacks: {
              onStart: function(id) {
                Ext.space.Logger.debug("download start: ", id, url);
                if (id) {
                  // cache a reference to the Download object, so we can
                  // continue to update it over time
                  manager.downloads[id] = download;
                }

                manager.watchDownloads();
              },
              onSuccess: function(id) {
                Ext.space.Logger.debug("download success: ", id);
                manager.getProgress(id).then(function(obj) {
                  Ext.space.SecureFiles.getFile(obj.fileKey).then(function(file) {
                    Ext.space.Logger.debug("Resolving successful download: ", id, file, obj);
                    obj.done.fulfill(file, obj);
                  });
                });
              },
              onError: function(error) {
                download.done.reject(error);
              }
            }
          });

        }
      }

      if (!args || !url) {
        download.done.reject("Missing URL");
      }

      return download;
    },

    /**
     * Retrieve the current status of all active downloads, plus the most recently
     * completed downloads.
     *
     * @param {Object} args (optional) Object with .onComplete and/or .onError
     *                      callback(s) to run when the download finishes
     * @return {Ext.space.Promise} Promise which will receive an array of
     *                       Ext.space.files.Download objects
     */
    getDownloads: function(args) {
      var promise = promisize(args);

      var manager = this;

      function makeDownload(item) {
        var id = item.downloadId;
        if (manager.downloads[id]) {
          return manager.downloads[id]._updateWith(item);
        } else {
          manager.downloads[id] = new Ext.space.files.Download(item);
          return manager.downloads[id];
        }
      }

      Ext.space.Communicator.send({
        command: "DownloadManager#getDownloads",
        callbacks: {
          onSuccess: function(responses) {
            Ext.space.Logger.debug("getDownloads: ", responses);
            if (Object.prototype.toString.call(responses) === "[object Array]") {
              // resolve with an array of Download objects
              promise.fulfill(responses.filter(downloadIsReal).map(makeDownload));
              manager.watchDownloads();

            } else {
              // what happened?
              promise.reject("Malformed (non-Array) response from the native bridge");
            }
          },
          onError: function(error) {
            promise.reject(error);
          }
        }
      });

      return promise;
    },

    /**
     * Check a download's progress (normally done via download.getProgress()).
     *
     * @private
     * @param {String|Object} args Download ID of the download to check, or an object
     *                             containing a .downloadId property containing such.
     * @return {Ext.space.Promise} Promise which will receive an up-to-date copy of the
     *                       Ext.space.files.Download
     */
    getProgress: function(args) {
      var id, promise, match, manager = this;

      if (args) {
        promise = promisize(args);
        id = typeof args == "number" ? args : extract(args, "downloadId");

        if (id && manager.downloads[id]) {
          if (manager.downloads[id].isComplete) {
            // if it's cached and complete, return it
            promise.fulfill(manager.downloads[id]);

          } else {
            // if it's cached and incomplete, get it from getDownloads
            this.getDownloads().then(function(downloads) {
              downloads.some(function(download) {
                if (download.downloadId === id) {
                  match = download;
                  return true;
                }
              });

              if (match) {
                promise.fulfill(match);
              } else {
                promise.reject("Download " + id + " not found");
              }

            }, function(error) {
              promise.reject(error);
            });
          }
        }


      }

      if (!args || !id) {
        if (!promise) {
          promise = new Ext.space.Promise();
        }
        promise.reject("Missing download ID");
      } else if (!manager.downloads[id]) {
        promise.reject("Download " + id + " not found");
      }

      return promise;
    },

    /**
     * Cancel a download (normally done via download.cancel()).
     *
     * @private
     * @param {String|Object} args Download ID of the download to check, or an object
     *                             containing a .downloadId property containing such.
     * @return {Ext.space.Promise} Promise which will resolve when the download is canceled. If
     *                       the download is already done or canceled, it will reject.
     */
    cancel: function(args) {
      var id, promise = new Ext.space.Promise(), manager = this;

      if (args) {
        promise = promisize(args);
        id = extract(args, "downloadId");

        if (id) {
          Ext.space.Communicator.send({
            command: "DownloadManager#cancel",
            downloadId: id,
            callbacks: {
              onSuccess: function() {
                manager.downloads[id].done.reject("Canceled");
                promise.fulfill(true);
              },
              onError: function(error) {
                promise.reject(error);
              }
            }
          });
        }
      }

      if (!args || !id) {
        promise.reject("Missing download ID");
      }

      return promise;
    },

    /**
     * Watch for updates coming in from the native bridge, to keep the internal
     * cache up to date
     *
     * @private
     */
    watchDownloads: function() {
      var manager = this,
        cache = this.downloads,
        activeCount = 0;

      function processItem(item) {
        var id = item.downloadId,
          alreadyComplete = !(id in cache) || (cache[id].isComplete && !cache[id].isVolatile),
          justCompleted = !alreadyComplete && item.isComplete && !item.isVolatile;

        // count the downloads still in progress so we know when to unwatch
        if (item.isVolatile) {
          activeCount++;
        }

        // create or update the cached download object
        if (cache[id]) {
          cache[id]._updateWith(item);
        } else {
          cache[id] = new Ext.space.files.Download(item);
        }

        // resolve the original promise with the final data
        if (justCompleted) {
          Ext.space.SecureFiles.getFile(cache[id].fileKey).then(function(file) {
            Ext.space.Logger.debug("Resolving watched download: ", id, file, cache[id]);
            cache[id].done.fulfill(file, cache[id]);
          });
        }
      }

      if (!manager.watching) {
        manager.watching = true;
        Ext.space.Communicator.send({
          command: "DownloadManager#watchDownloads",
          callbacks: {
            onSuccess: function(responses) {
              Ext.space.Logger.debug("watchDownloads: ", responses.length, responses);
              activeCount = 0;
              if (Object.prototype.toString.call(responses) === "[object Array]") {
                responses.forEach(processItem);
                if (!activeCount) {
                  manager.unwatchDownloads();
                }
              }
              Ext.space.Logger.debug("watchDownloads activeCount: ", activeCount);
            },
            onError: function(error) {
              Ext.space.Logger.debug("watchDownloads encountered an error; unwatching. Error: ", error);
              manager.unwatchDownloads();
            }
          }
        });
      }
    },

    /**
     * Discontinue watching for download updates from the native bridge
     *
     * @private
     */
    unwatchDownloads: function() {
      if (this.watching) {
        Ext.space.Communicator.send({
          command: "DownloadManager#unwatchDownloads"
        });
        this.watching = false;
      }
    }
  });

}());

(function(){

  /**
   * Promise-based API for uploading files via HTTP POST to a form handler URL.
   *
   * TODO fix the docs here
   * To upload a file:
   *
   *      // list some details when the upload completes
   *      function onComplete(file, upload) {
 *          Ext.space.Logger.log("Upload finished: " + upload.url);
 *          Ext.space.Logger.log("Upload size: " + upload.totalBytes);
 *          Ext.space.Logger.log("Saved to: " + upload.fileName);
 *          Ext.space.Logger.log("File path: " + file.path);
 *          Ext.space.Logger.log("File name: " + file.name);
 *          Ext.space.Logger.log("File size on disk: " + file.size);
 *      }
   *
   *      Ext.space.Uploads.upload({ url: "http://www.sencha.com/" }).then(onComplete);
   *
   * The `upload` objects involved here are instances of Ext.space.files.Upload;
   * the `file` object is an Ext.space.files.File.
   *
   * To get a list of all uploads currently in progress, plus up to the ten most
   * recently completed uploads:
   *
   *      Ext.space.Uploads.getUploads().then(function(uploads) {
 *          uploads.forEach(function(upload) {
 *              Ext.space.Logger.log(upload.fileName);
 *          });
 *      });
   *
   * If you have a upload object and want to fetch the latest information about it,
   * you can get the progress of a single upload at a time:
   *
   *      upload.getProgress().then(function(updatedUpload) {
 *          Ext.space.Logger.log(updatedUpload.bytesUploaded + " bytes uploaded");
 *      });
   *
   * Alternatively, you can wire up a progress event callback on the upload:
   *
   *      upload.on("progress", function(updatedUpload) {
 *          // gets called every time new progress is available
 *      });
   *
   * To cancel a upload in progress:
   *
   *      upload.cancel().then(function() {
 *          Ext.space.Logger.log("Canceled!");
 *      });
   *
   * @aside guide file_locker
   *
   */
  Ext.define("Ext.space.Uploads", {
    singleton: true,

    /**
     * @private
     * Cache of the upload information returned by the native bridge
     */
    uploads: null,

    /**
     * @private
     * Whether or not the upload manager has registered callbacks with the native bridge UploadManager#watchUploads
     */
    watching: false,

    /**
     * @private
     */
    constructor: function() {
      this.uploads = {};
    },

    /**
     * Upload a file.
     *
     * Normal usage is to pass in only the URL, and attach callbacks to the returned
     * Promise via .then(...). If you pass callbacks directly, in the args parameter,
     * they are installed as the respective Promise handlers before returning.
     *
     * @param {Object} args Upload parameters
     * @param {String} args.url The URL where the file will be posted.
     * @param {String} args.fileFieldName The post field name to assign the file to.
     * @param {Object} args.params Optional POST parameters to be sent along with the file.
     * @param {Object} args.headers Optional http headers to be sent along with the file.
     * @return {Ext.space.Promise} Promise that will resolve with the upload response
     */
    upload: function(args) {
      var upload = new Ext.space.files.Upload();
      var promise = upload.done;

      if (!args) {
        promise.reject("Missing upload arguments definition");

      } else if (!args.key) {
        promise.reject("Missing file key");

      } else if (!args.url) {
        promise.reject("Missing URL");

      } else if (!args.fileFieldName) {
        promise.reject("Missing fileFieldName");

      } else {
        var cmd = {
          command: "Files#uploadFile",
          key: args.key,
          postUrl: args.url,
          fileFieldName: args.fileFieldName,
          callbacks: {
            // TODO: when UploadManger is done, switch to this onStart method, remove onSuccess
            /*
             onStart: function(id) {
             if (id) {
             // cache a reference to the Upload object, so we can
             // continue to update it over time
             manager.uploads[id] = upload;
             }

             manager.watchUploads();
             },
             // no onSuccess callback because we'll let watchUploads do
             // the necessary notification
             // onSuccess: function(id) {},
             */
            onSuccess: function(response) {
              Ext.space.Logger.warn("Upload complete", response);
              if (response && !upload.response) {
                upload.response = response;
              }
              promise.fulfill(args.file, upload);
            },
            onError: function(error) {
              promise.reject(error);
            }
          }
        };

        if (args.params) {
          cmd.params = args.params;
        }
        if (args.headers) {
          cmd.headers = args.headers;
        }

        Ext.space.Communicator.send(cmd);
      }

      // TODO when UploadManger is done, just return upload
      return upload.done;
    },

    /**
     * Retrieve the current status of all active uploads, plus the most recently
     * completed uploads.
     *
     * @return {Ext.space.Promise} Promise which will receive an array of
     *                       Ext.space.files.Upload objects
     */
    getUploads: function(args) {
      var promise = new Ext.space.Promise();
      var manager = this;

      function makeUpload(item) {
        var id = item.uploadId;
        if (manager.uploads[id]) {
          return manager.uploads[id]._updateWith(item);
        } else {
          manager.uploads[id] = new Ext.space.files.Upload(item);
          return manager.uploads[id];
        }
      }

      Ext.space.Communicator.send({
        command: "UploadManager#getUploads",
        callbacks: {
          onSuccess: function(responses) {
            if (Object.prototype.toString.call(responses) === "[object Array]") {
              // resolve with an array of Upload objects
              promise.fulfill(responses.map(makeUpload));
              manager.watchUploads();

            } else {
              // what happened?
              promise.reject("Malformed (non-Array) response from the native bridge");
            }
          },
          onError: function(error) {
            promise.reject(error);
          }
        }
      });

      return promise;
    },

    /**
     * Check a upload's progress (normally done via upload.getProgress()).
     *
     * @private
     * @param {Object} upload Upload to check
     * @return {Ext.space.Promise} Promise which will receive an up-to-date copy of the
     *                       Ext.space.files.Upload
     */
    getProgress: function(upload) {
      var id, match, manager = this;
      var promise = new Ext.space.Promise();

      if (!upload) {
        promise.reject("Missing upload");

      } else {
        id = upload.uploadId;

        if (id && manager.uploads[id]) {
          if (manager.uploads[id].isComplete) {
            // if it's cached and complete, return it
            promise.fulfill(manager.uploads[id]);

          } else {
            // if it's cached and incomplete, get it from getUploads
            this.getUploads().then(function(uploads) {
              uploads.some(function(ul) {
                if (ul.uploadId === id) {
                  match = ul;
                  return true;
                }
              });

              if (match) {
                promise.fulfill(match);
              } else {
                promise.reject("Upload " + id + " not found");
              }

            }, function(error) {
              promise.reject(error);
            });
          }
        } else {
          promise.reject("Upload " + id + " not found");
        }
      }

      return promise;
    },

    /**
     * Cancel a upload (normally done via upload.cancel()).
     *
     * @private
     * @param {Object} upload Upload to check
     * @return {Ext.space.Promise} Promise which will resolve when the upload is canceled. If
     *                       the upload is already done or canceled, it will reject.
     */
    cancel: function(upload) {
      var promise = new Ext.space.Promise(), manager = this;

      if (!upload || !upload.uploadId) {
        promise.reject("Missing upload ID");

      } else {
        Ext.space.Communicator.send({
          command: "UploadManager#cancelUpload",
          uploadId: upload.uploadId,
          callbacks: {
            onSuccess: function() {
              manager.uploads[upload.uploadId].done.reject("Canceled");
              promise.fulfill(true);
            },
            onError: function(error) {
              promise.reject(error);
            }
          }
        });
      }

      return promise;
    },

    /**
     * Watch for updates coming in from the native bridge, to keep the internal
     * cache up to date
     *
     * @private
     */
    watchUploads: function() {
      var manager = this,
        cache = this.uploads,
        activeCount = 0;

      function processItem(item) {
        var id = item.uploadId,
          alreadyComplete = !(id in cache) || cache[id].isComplete,
          justCompleted = !alreadyComplete && item.isComplete;

        // count the uploads still in progress to we know when to unwatch
        if (!item.isComplete) {
          activeCount++;
        }

        // create or update the cached upload object
        if (cache[id]) {
          cache[id]._updateWith(item);
        } else {
          cache[id] = new Ext.space.files.Upload(item);
        }

        // resolve the original promise with the final data
        if (justCompleted) {
          Ext.space.SecureFiles.getFile(cache[id].fileKey).then(function(file) {
            cache[id].done.fulfill(file, cache[id]);
          });
        }
      }

      if (!manager.watching) {
        manager.watching = true;
        Ext.space.Communicator.send({
          command: "UploadManager#watchUploads",
          callbacks: {
            onSuccess: function(responses) {
              activeCount = 0;
              if (Object.prototype.toString.call(responses) === "[object Array]") {
                responses.forEach(processItem);
                if (!activeCount) {
                  manager.unwatchUploads();
                }
              }
            },
            onError: function(error) {
              manager.unwatchUploads();
            }
          }
        });
      }
    },

    /**
     * Discontinue watching for upload updates from the native bridge
     *
     * @private
     */
    unwatchUploads: function() {
      if (this.watching) {
        Ext.space.Communicator.send({
          command: "UploadManager#unwatchUploads"
        });
        this.watching = false;
      }
    }
  });

}());

/**
 * Base class for uploads and transfers.
 *
 * @private
 */
Ext.define("Ext.space.files.Transfer", {
  /**
   * Object reference to the transfer management object for this item.
   * @private
   */
  manager: null,

  /**
   * Internal promise that tracks transfer completion
   * @type {Ext.space.Promise}
   * @private
   */
  done: null,

  /**
   * Internal event handlers
   * @type {Object}
   * @private
   */
  events: null,

  /**
   * Field name for the internal identifier for this transfer
   * @type {String}
   */
  idField: null,

  /**
   * File key for the saved file
   * @type {Number}
   */
  fileKey: null,

  /**
   * Source/Destination URL
   * @type {String}
   */
  url: null,

  /**
   * Progress so far
   * @type {Number}
   */
  bytesTransferred: 0,

  /**
   * Final size
   * @type {Number}
   */
  totalBytes: 0,

  /**
   * transfer status
   * @type {Boolean}
   */
  isComplete: false,

  /**
   * Transfer status, that lags behind isComplete (so we can check to see if the
   * Transfer just finished, or has been complete for a little while)
   * @type {Boolean}
   * @private
   */
  everCompleted: false,

  /**
   * When the transfer initiated
   * @type {Date}
   */

  dateStarted: null,

  /**
   * @private
   */
  constructor: function(args) {
    this.done = new Ext.space.Promise();
    this.events = {
      progress: new Ext.space.Observable()
    };
    this._updateWith(args);
  },

  /**
   * Create handlers for transfer completion and/or error.
   *
   * @param {Function} onsuccess (optional) Callback invoked when the transfer is
   *                             completed. Receives two parameters: the file on
   *                             disk, and the transfer object (the Upload or
   *                             Download) itself.
   * @param {Function} onerror (optional) Callback invoked when the transfer is
   *                           canceled or errors out for some reason.
   * @return {Ext.space.Promise} Promise that resolves after the transfer itself is
   *                       resolved and the onsuccess/onerror callback is fired
   *                       (as in regular promise chaining).
   */
  then: function(onsuccess, onerror) {
    return this.done.then(onsuccess, onerror);
  },

  /**
   * Check this transfer's progress.
   *
   * @return {Ext.space.Promise} Promise which will fulfill when progress is fetched and
   *                       updated into this object (and which is resolved with this
   *                       transfer as a parameter too).
   */
  getProgress: function() {
    return this.manager ? this.manager.getProgress(this) : null;
  },

  /**
   * Cancel this transfer.
   *
   * @return {Ext.space.Promise} Promise which will fulfills when the transfer is
   *                       successfully canceled. If the transfer is already done,
   *                       the promise will reject.
   */
  cancel: function() {
    return this.manager ? this.manager.cancel(this) : null;
  },

  /**
   * Bulk update this transfer with the data provided.
   *
   * @private
   * @param {object} source Object with data to overwrite onto this transfer
   */
  _updateWith: function(source) {
    if (source) {
      if (source[this.idField]) { this[this.idField] = source[this.idField]; }
      if (source.fileKey) { this.fileKey = source.fileKey; }
      if (source.url) { this.url = source.url; }
      if (source[this.bytesTransferredField]) { this[this.bytesTransferredField] = source[this.bytesTransferredField]; }
      if (source.totalBytes) { this.totalBytes = source.totalBytes; }
      if (source.isComplete) { this.isComplete = true; }
      if (source.dateStarted) { this.dateStarted = new Date(source.dateStarted * 1000); }

      // fire a progress event if we have sufficient data and we're not done
      if (this[this.idField] && !this.everCompleted) {
        this.events.progress.invokeListeners(this);
        this.everCompleted = this.isComplete;
      }
    }
    return this;
  },

  /**
   * Wire up event listeners for the transfer.
   *
   * There is currently only one event applications can listen for: 'progress',
   * which means something has been updated.
   *
   * @param {String} event Event name to listen for (start, progress)
   * @param {Function} callback Callback to invoke when the event fires
   * @return {Object} The download object, to facilitate method chaining
   */
  on: function(event, callback) {
    var events = this.events;

    // only register events we support; otherwise just silently swallow it
    if (events[event]) {
      events[event].addListener(callback);
    }

    return this;
  }
});

(function() {

// utility function to reject the given promise with the first parameter passed to
// the callback; intended as a shorthand for creating bridge call error handlers that
// simply bail out when something goes wrong
  function reject(promise) {
    return function(error) {
      promise.reject(error);
    };
  }

// utility function to add a wildcard before a filename's extension, e.g., transform
// 'index.html' => 'index*.html', 'index.foo.whatever.html' => 'index.foo.whatever*.html'
  function wildcardify(name) {
    var parts = name.split(".");
    if (parts.length == 1) {
      parts[0] += "*";
    } else {
      parts[parts.length-2] += "*";
    }
    return parts.join(".");
  }

// utility function that takes a name like foo.something.html and inserts `idx`
// before the extension, returning, e.g., 'foo.something.2.html'
  function indexifyName(name, idx) {
    var parts = name.split(".");
    return parts.slice(0, parts.length-1)
      .concat(idx)
      .concat(parts[parts.length-1])
      .join(".");
  }


  /**
   * Key/Value store for files. A collection represents a flat grouping of files in an
   * application's file system, and it allows you to do basic CRUD operations on the
   * files contained therein. Typically you don't instantiate a collection yourself;
   * use Ext.space.SecureFiles.get() to create one.
   *
   * The `file` objects used in this API are instances of Ext.space.files.File.
   *
   * To create a collection:
   *
   *       var myCollection = Ext.space.SecureFiles.get("secrets");
   *
   * To retrieve file contents:
   *
   *       myCollection.get("someFile.txt").then(function(contents) {
*           // got 'em
*       });
   *
   * To write file contents:
   *
   *       myCollection.set("someFile.txt", "The new contents").then(function(file) {
*           // `file` is the Ext.space.files.File that was written
*       });
   *
   * ...and more. See the individual methods for full documentation.
   *
   */
  Ext.define("Ext.space.files.Collection", {
    /**
     * @private
     * @type {String}
     * Root virtual path for the files in this collection
     */
    name: null,

    /**
     * @private
     * @type {Object}
     * Hash of files descriptors in this collection, by file key
     */
    files: null,

    /**
     * @private
     */
    constructor: function(name) {
      // store the collection name and create the file cache
      this.name = name;
      this.files = {};
    },

    /**
     * Cache a file descriptor object in our local catalog.
     *
     * @private
     * @param {Object} obj File descriptor object (as a property bag)
     * @return {Ext.space.files.File} File object
     */
    _cache: function(obj) {
      var file = this._makeFile(obj);
      var id = file.key;
      if (this.files[id]) {
        // update the cached file
        this.files[id]._updateWith(obj);
      } else {
        // cache a new one
        this.files[id] = file;
      }
      return this.files[id];
    },

    /**
     * Bulk load an array of file descriptors loaded from the bridge into our cache.
     *
     * @private
     * @param {Array} results Results of a bridge query
     * @return {Array} Array of the Ext.space.files.File objects that got cached
     */
    _cacheResults: function(results) {
      return results.map(this._cache.bind(this));
    },

    /**
     * Transform a property bag file descriptor object into a real Ext.space.files.File.
     *
     * @private
     * @param {Object} obj File descriptor object (as a property bag)
     * @return {Ext.space.files.File} File object
     */
    _makeFile: function(obj) {
      var file = new Ext.space.files.File(obj);
      file.collection = this;
      return file;
    },

    /**
     * Retrieve an item from the local catalog, by name or File object.
     *
     * @private
     * @param {String} fileOrName File name as a string, or Ext.space.files.File object
     * @return {Ext.space.files.File} File descriptor object
     */
    _getItemByName: function(fileOrName) {
      var match;
      Object.keys(this.files).some(function(id) {
        if (this.files[id].name === (typeof fileOrName === "string" ? fileOrName : fileOrName.name)) {
          match = this.files[id];
          return true;
        }
      }, this);
      return match;
    },

    /**
     * Query the collection for files matching the given criteria. See the main
     * Ext.space.SecureFiles.query() documentation for query definitions.
     *
     * @private
     * @param {Object} query (optional) Query object
     * @param {Object} options (optional) Query options
     * @return {Ext.space.Promise} Promise that resolves with the Ext.space.files.File
     *                       objects that match the criteria.
     */
    _query: function(query, options) {
      var qry = {path: this.name};

      if (query) {
        // copy the query as is
        if (query.name) { qry.name = query.name; }
        if (query.type) { qry.type = query.type; }
        if (query.createdBefore) { qry.createdBefore = query.createdBefore; }
        if (query.createdAfter) { qry.createdAfter = query.createdAfter; }
        if (query.modifiedBefore) { qry.modifiedBefore = query.modifiedBefore; }
        if (query.modifiedAfter) { qry.modifiedAfter = query.modifiedAfter; }
      }

      if (options) {
        options.collection = this;
      } else {
        options = {collection: this};
      }

      return Ext.space.SecureFiles.query(qry, options);
    },

    /**
     * Load a file descriptor from the filesystem, by name.
     *
     * @private
     * @param {String} name File name
     * @return {Ext.space.Promise} Promise that resolves with the file's cached catalog object;
     *                       if the file isn't found, the promise rejects.
     */
    _loadFile: function(name) {
      // Note that this method exhibits behavior slightly different than the native
      // bridge's #queryFiles operation being used here. The bridge considers a
      // zero-length result to still be a success as long as the operation doesn't
      // encounter an error of some sort. Since this method is simply attempting
      // to load metadata for a file, if the query itself succeeds but the file
      // doesn't exist, we reject the promise. That allows consuming code to, e.g.,
      // go back and create a file, then retry whatever it was doing.
      var result = new Ext.space.Promise();
      var collection = this;

      this.query({ name: name }).then(function(items) {
        // there really only should be a single match here; what
        // should we do if there's more than one?
        if (items.length) {
          result.fulfill(items[0]);
        } else {
          result.reject("File not found: " + collection.name + " :: " + name);
        }
      });
      return result;
    },

    /**
     * Retrieve the contents of a file by key.
     *
     * @private
     * @param {String} key File key
     * @param {Ext.space.files.File} file (optional) File object, to pass file descriptor data through into the promise
     * @return {Ext.space.Promise} Promise that resolves with the file's contents, plus possibly the file descriptor data
     */
    loadContents: function(key, file) {
      var result = new Ext.space.Promise();
      Ext.space.Communicator.send({
        command: "Files#getFileContents",
        key: key,
        callbacks: {
          onSuccess: function(contents) {
            result.fulfill(contents, file);
          },
          onError: reject(result)
        }
      });
      return result;
    },

    /**
     * Create a file by name, with optional type, path, and contents.
     *
     * @private
     * @param {String} name File name
     * @param {Object} props (optional) Hash with extra data in .type  and/or .contents
     * @return {Ext.space.Promise} Promise that resolves with the Ext.space.files.File object created
     */
    _createFile: function(name, props) {
      var result = new Ext.space.Promise();
      var collection = this;

      var args = {
        command: "Files#createFile",
        path: this.name,
        name: name,
        callbacks: {
          onSuccess: function(fileData) {
            result.fulfill(collection._cache(fileData));
          },
          onError: reject(result)
        }
      };

      // add the optional parameters
      if (props) {
        if (props.type) { args.type = props.type; }
        if (props.contents) { args.fileData = props.contents; }
      }

      Ext.space.Communicator.send(args);

      return result;
    },

    /**
     * Remove a file's cached object from this collection (the actual file on disk
     * remains untouched).
     *
     * @private
     * @param {Ext.space.files.File} file File object
     */
    _disownFile: function(file) {
      // we don't need the cached object to be the same instance as what got passed
      // in here as a parameter, so we just check that there's a cached item with
      // the correct file key
      if (file.collection === this && this.files[file.key]) {
        delete this.files[file.key];
      }
    },

    /**
     * Move the given file into this collection, renaming it if a name is provided.
     *
     * @private
     * @param {Ext.space.files.File} file File object
     * @param {String} name (optional) New name for the file
     * @return {Ext.space.Promise} Promise that resolves when the file is done moving
     */
    _ownFile: function(file, name) {
      var result = new Ext.space.Promise();

      var args = {
        command: "Files#renameFile",
        key: file.key,
        newPath: this.name,
        overwrite: true,
        callbacks: {
          onSuccess: function(overwrittenKey) {
            // remove from the original collection object
            file.collection._disownFile(file);

            // check whether we need to unwire any loaded file objects in
            // any collections due to a file disappearing
            if (overwrittenKey) {
              Ext.space.SecureFiles._removeFileFromLoadedCollections(overwrittenKey);
            }

            // wire up the new associations/properties
            file.collection = this;
            file.path = this.path;
            if (name) { file.name = name; }
            this.files[file.key] = file;

            result.fulfill(file);
          }.bind(this),
          onError: reject(result)
        }
      };

      if (name) { args.newName = name; }

      Ext.space.Communicator.send(args);

      return result;
    },

    /**
     * Move the given file into this collection, renaming the file if the collection
     * already contains a file with the same name.
     *
     * @private
     * @param {Ext.space.files.File} file File object
     * @return {Ext.space.Promise} Promise that resolves when the file is done moving
     */
    _ownFileSafe: function(file) {
      var result = new Ext.space.Promise();

      // look for an existing file with the same name in the collection
      this.query({ name: wildcardify(file.name) }).then(function(files) {
        var fileNames, testName, chosenName, done = false, idx = 0;

        if (!files) {
          // didn't get even an empty array of files, which shouldn't happen
          result.reject("Error moving the downloaded file into the collection.");

        } else {
          // can we use the original name as is?
          fileNames = files.map(function(f) { return f.name; });
          if (fileNames.indexOf(file.name) == -1) {
            chosenName = file.name;
            done = true;
          }
          // generate names and check them against the queried results
          // to avoid conflicts
          while (!done) {
            testName = indexifyName(file.name, ++idx);
            if (fileNames.indexOf(testName) == -1) {
              chosenName = testName;
              done = true;
            }
          }

          // take ownership of the file and pass it into our returned promise
          this._ownFile(file, chosenName).connect(result);
        }

      }.bind(this), function(error) {
        result.reject("Error querying the collection for conflicting files.");
      });

      return result;
    },

    /**
     * Launch the native viewer for a file by key.
     *
     * @private
     * @param {String} key File key
     * @return {Ext.space.Promise} Promise that resolves when the viewer is launched
     */
    viewFile: function(key) {
      var result = new Ext.space.Promise();
      Ext.space.Communicator.send({
        command: "Files#viewFile",
        key: key,
        callbacks: {
          onSuccess: function() {
            result.fulfill();
          },
          onError: reject(result)
        }
      });
      return result;
    },

    /**
     * Remove a file from disk.
     *
     * @private
     * @param {String} key File key
     * @return {Ext.space.Promise} Promise that resolves when the file is removed
     */
    removeFile: function(key) {
      var result = new Ext.space.Promise();
      var collection = this;
      var file = this.files[key];

      Ext.space.Communicator.send({
        command: "Files#removeFile",
        key: key,
        callbacks: {
          onSuccess: function() {
            // remove the cached item from the collection's internal catalog
            Object.keys(collection.files).some(function(id) {
              if (id.toString() === file.key.toString()) {
                delete collection.files[id];
                Ext.space.SecureFiles._removeFileFromLoadedCollections(id);
                return true;
              }
            });
            result.fulfill(true);
          },
          onError: reject(result)
        }
      });

      return result;
    },

    /**
     * Write the contents of a file by key.
     *
     * @private
     * @param {String} key File key
     * @param {String} contents Contents to write
     * @return {Ext.space.Promise} Promise that resolves with the File object having been written
     */
    writeContents: function(key, contents) {
      // note: only call this method if you're sure the file already exists;
      //       otherwise the bridge will invoke the onError handler
      var result = new Ext.space.Promise();
      var collection = this;

      Ext.space.Communicator.send({
        command: "Files#setFileContents",
        key: key,
        fileData: contents,
        callbacks: {
          onSuccess: function() {
            result.fulfill(collection.files[key]);
          },
          onError: reject(result)
        }
      });

      return result;
    },


    /**
     * Get the file contents for a name.
     *
     *      var files = Ext.space.SecureFiles.get('secrets');
     *
     *      files.get('myFile').then(function(contents){
     *          // do something with the contents of the file.
     *      });
     *
     * @param {String} name File name for which to retrieve contents
     * @return {Ext.space.Promise} Promise that resolves when the contents are available
     *
     */
    get: function(name) {
      var result, item = this._getItemByName(name);
      var collection = this;

      function loadContents(catalogItem) {
        return collection.loadContents(catalogItem.key, catalogItem);
      }

      if (item && item.key) {
        // we have the key, let's go straight to loading the contents
        result = loadContents(item);
      } else {
        // couldn't find the key in cache (weird, why?), so re-query for the file
        result = this._loadFile(name).then(loadContents, function(error) { result.reject(error); });
      }
      return result;
    },

    /**
     * Write the given contents to a file.
     *
     *      var files = Ext.space.SecureFiles.get('secrets');
     *
     *      files.set('myFile', 'the contents go here').then(function(file) {
     *          // can do something with `file` here
     *      });
     *
     * @param {String|Object} name File name to which to write contents, or an object
     *                             with properties specifying the name and MIME type
     *                             of the file, e.g., `{name: "foo", type: "text/plain"}`.
     *                             Note that the type will only be stored if the file
     *                             is being created; if the file already exists, any
     *                             provided type will be ignored
     * @param {String} contents Contents to write
     * @return {Ext.space.Promise} Promise that resolves when the file is written
     */
    set: function(name, contents) {
      var result, item, type, collection = this;

      if (typeof name === "object") {
        type = name.type;
        name = name.name;
      }

      item = this._getItemByName(name);

      function writeContents(catalogItem) {
        return collection.writeContents(catalogItem.key, contents);
      }
      function createWithContents() {
        // if the file doesn't exist, create it with the given contents
        collection._createFile(name, {contents: contents, type: type}).then(function(file) {
          result.fulfill(file);
        });
      }

      if (item && item.key) {
        // we have the key, let's go straight to writing
        result = writeContents(item);
      } else {
        // couldn't find the key in cache (weird, why?), so re-query for the file
        this._loadFile(name).then(writeContents, createWithContents);
        result = new Ext.space.Promise();
      }
      return result;
    },

    /**
     * Query the collection for files matching the given criteria. See the main
     * Ext.space.SecureFiles.query() documentation for query definitions.
     *
     * @param {Object} query (optional) Query object
     * @param {String} query.name (optional) exactName.txt", "*.txt", etc...
     * @param {String} query.type MIME type ("text/plain", etc...)
     * @param {Date} query.createdBefore (optional) Date object
     * @param {Date} query.modifiedBefore (optional) Date object
     * @param {Date} query.modifiedAfter (optional) Date object
     * @param {String} options(optional) modifies how  the results will be returned
     * @param {String} options.fetch  (optional) "count" or "data" (the default), to return a simple count, or the complete results, respectively
     * @param {String} options.sortField  (optional)  name of the field on which to sort
     * @param {String} options.sortDirection  (optional)  "asc" or "desc"
     * @return {Ext.space.Promise} Promise that resolves with the Ext.space.files.File
     *                       objects that match the criteria.
     */
    query: function(query, options) {
      return this._query(query, options).then(this._cacheResults.bind(this));
    },

    /**
     * Delete all of the files in this collection.
     *
     * @return {Ext.space.Promise} Promise that resolves when the files are deleted
     */
    clear: function() {
      var collection = this;

      function removeFile(key) { return collection.removeFile(key); }

      return this.query().then(function(items) {
        return Ext.space.Promise.whenComplete(Object.keys(this.files).map(removeFile)).then(function() {
          return;
        });
      }.bind(this));
    },

    /**
     * Returns a count of the total number of files in the collection.
     *
     *      var secrets = Ext.space.SecureFiles.get('secrets');
     *
     *      secrets.count().then(function(count) {
     *          // done
     *      });
     *
     * @return {Ext.space.Promise} Promise that resolves with the number of files in the collection
     */
    count: function() {
      return this._query(null, { fetch: "count" });
    },


    /**
     * Checks to see if the given file exists.
     *
     *      var secrets = Ext.space.SecureFiles.get('secrets');
     *
     *      secrets.has('myFile').then(function(hasKey) {
     *          // check hasKey
     *      });
     *
     * @param {String} name Name of the file for which to search
     * @return {Ext.space.Promise} Promise that resolves with a boolean indicating presence of the file
     */
    has: function(name) {
      var result = new Ext.space.Promise();
      this._loadFile(name).then(function() {
        result.fulfill(true);
      }, function(error) {
        result.fulfill(false);
      });
      return result;
    },

    /**
     * Deletes the file (if present).
     *
     *      var secrets = Ext.space.SecureFiles.get('secrets');
     *
     *      secrets.remove('myFile').then(function(done) {
     *          // done
     *      });
     *
     * @param {String} name Name of the file to delete
     * @return {Ext.space.Promise} Promise that resolves when the file is deleted
     *
     */
    remove: function(name) {
      var result, item = this._getItemByName(name);
      var collection = this;

      function removeFile(catalogItem) {
        return collection.removeFile(catalogItem.key);
      }

      if (item && item.key) {
        // we have the key, let's go straight to removing it
        result = removeFile(item);
      } else {
        // load it to get the key; if it's not found, act as though we succeeded
        result = this._loadFile(name).then(removeFile, function(error) { result.fulfill(true); });
      }

      return result;
    },

    /**
     * Alias for .remove()
     *
     * @private
     * @return {Ext.space.Promise} the promise that will resolve when the value is checked
     */
    delete: function(name) {
      return this.remove.apply(this, arguments);
    },


    /**
     * Launches the viewer for a file.
     *
     *      var secrets = Ext.space.SecureFiles.get('secrets');
     *
     *      secrets.view('myFile').then(function() {
     *          // launched
     *      });
     *
     * @param {String} name Name of the file to view
     * @return {Ext.space.Promise} Promise that resolves when the file viewer is launched
     *
     */
    view: function(name) {
      var result, item = this._getItemByName(name);
      var collection = this;

      function viewFile(catalogItem) {
        return collection.viewFile(catalogItem.key);
      }

      if (item && item.key) {
        // we have the key, let's go straight to removing it
        result = viewFile(item);
      } else {
        // load it to get the key
        result = this._loadFile(name).then(viewFile, reject(result));
      }

      return result;
    },


    /**
     * Generate a list of all the names of the files in the collection, in no
     * particular order.
     *
     *      var secrets = Ext.space.SecureFiles.get('secrets');
     *
     *      secrets.keys().then(function(keys) {
     *          // array of file names
     *      });
     *
     * @return {Ext.space.Promise} Promise that will resolve when all of the keys have been collected.
     *
     */
    keys: function() {
      return this.query().then(function(items) {
        return Object.keys(this.files).map(function(id) { return this.files[id].name; }, this);
      }.bind(this));
    },


    /**
     * Iterates over all the files in a collection
     *
     *      var secrets = Ext.space.SecureFiles.get('secrets');
     *
     *      secrets.forEach(function(file) {...}).then(function() {
     *          // done
     *      });
     *
     * @param {Function}  callback Function to call once for each file in the collection.
     *                             As with Array.prototype.forEach, it receives three
     *                             parameters: an Ext.space.files.File object, its index
     *                             in the array being iterated, and the array of files
     *                             itself. Note however that the order of elements in
     *                             this array are NOT guaranteed in any way.
     * @param {Object} thisArg (optional) Value to use for `this` when executing the callback.
     * @return {Ext.space.Promise} Promise that resolves with an array of the File objects
     *                       operated on, after the callback has been run across the
     *                       entire collection.
     */
    forEach: function(callback, thisArg) {
      var args = arguments;
      return this.query().then(function(items) {
        items.forEach.apply(items, args);
        return items;
      });
    },


    /**
     * Downloads a file from the given URL into this collection.
     *
     * If you pass overwrite: true in the args parameter, the file will be overwritten
     * if the name conflicts with a file that already exists.
     *
     *      var secrets = Ext.space.SecureFiles.get('secrets');
     *
     *      // saves the file as 'file.html' from the URL
     *      secrets.download({ url: 'http://example.com/some/file.html' }).then(function(file) {
     *          // do something with the file
     *      });
     *
     *      // overwites file.html
     *      secrets.download({
     *          url: 'http://example.com/some/file.html',
     *          overwrite: true
     *      }).then(function(file) {
     *          // do something with the file
     *      });
     *
     * @param {Object} args Download parameters
     * @param {String} args.url The URL of the file to be downloaded
     * @param {Boolean} args.overwrite true/false (default false) to determine what to do in the case of a name collision.
     * @return {Ext.space.Promise} Promise that resolves with the File object for the file
     *                       downloaded
     */
    download: function(args) {
      var result = new Ext.space.Promise();
      var collection = this;
      var overwrite = !!(args && args.overwrite);

      if (!(args && args.url)) {
        result.reject("Missing URL");
      } else {
        Ext.space.Downloads.download({ url: args.url }).then(function(file, download) {
          collection[overwrite ? "_ownFile" : "_ownFileSafe"](file).connect(result);
        }, function(error) {
          result.reject("Download error: " + error);
        });
      }

      return result;
    },

    /**
     * Compress the entire collection into an archive.
     *
     *      var collection = Ext.space.SecureFiles.get("somepath");
     *      collection.compress({ archiveName: "somefiles.zip" }).then(function(file) {
     *          // do something with the archive file
     *      });
     *
     *      // or specify more options:
     *      collection.compress({
     *          archiveName: "somefiles.blob",
     *          path: "myArchivePath",
     *          type: "zip"
     *      }).then(function(file) {
     *          // do something with the archive file
     *      });
     *
     * @param {Object} args Options object
     * @param {String} args.archiveName Name of the archive file to create
     * @param {String} args.path (optional) Path into which to save the archive; defaults to ""
     * @param {String} args.type (optional) Compression type ("zip", "zip", "bzip2", "7zip");
     *                           if this is omitted, the system will attempt to determine
     *                           the compression type from the archiveName, and if it
     *                           cannot be determined, defaults to "zip".
     * @return {Ext.space.Promise} Promise that resolves with the Ext.space.files.File
     *                       object for the new archive.
     */
    compress: function(args) {
      var result = new Ext.space.Promise();

      if (!args) {
        result.reject("Missing compression arguments");

      } else if (!args.archiveName) {
        result.reject("Missing compressed archive name");

      } else {
        this.query().then(function(items) {
          var opts = {
            files: items,
            archiveName: args.archiveName,
            path: args.path,
            type: args.type
          };

          Ext.space.SecureFiles.compress(opts).connect(result);
        });
      }

      return result;
    }

  });

})();

(function() {


  /**
   * The File class is used to represent a file in the file system. It's little more
   * than a property bag, but with documentation. Typically you don't instantiate these
   * yourself, but use an Ext.space.files.Collection object to create them.
   */
  Ext.define("Ext.space.files.File", {

    /***
     * @private
     * @readonly
     * The protocol for the URL of the file.
     */
    urlProtocol: "sfile://",

    /**
     * File system key
     * @readonly
     * @type {Number}
     */
    key: null,


    /**
     * The local URL in the secure file system.
     * This URL can be referenced inside of application as part of an image or an in-line style
     * or any where the browser makes a network request for a resource.
     *
     * Requests to this URL will not result in a network request
     * This URL can only be accessed by this application, cross application requests are not allowed.
     *
     * The value of this string should be considered temporary and could change from release to release
     * Do not store the value other than in memory.
     *
     * @readonly
     * @type {String}
     */
    url: null,


    /**
     * Filename (excluding path)
     * @readonly
     * @type {String}
     */
    name: null,

    /**
     * Creation timestamp
     * @readonly
     * @type {Date}
     */
    created: null,

    /**
     * Last Modified timestamp
     * @readonly
     * @type {Date}
     */
    modified: null,

    /**
     * MIME type
     * @readonly
     * @type {String}
     */
    mimeType: null,

    /**
     * Simplified file type
     * @readonly
     * @type {String}
     */
    type: null,

    /**
     * Name of the application that created/owns this file
     * @readonly
     * @type {String}
     */
    appName: null,

    /**
     * ID of the application that created/owns this file
     * @readonly
     * @type {String}
     */
    appId: null,

    /**
     * Virtual path to the file
     * @readonly
     * @type {String}
     */
    path: null,

    /**
     * File size in bytes
     * @readonly
     * @type {Number}
     */
    size: 0,

    /**
     * Collection which owns this file
     * @private
     * @type {Ext.space.files.Collection}
     */
    collection: null,

    /**
     * @private
     */
    constructor: function(args) {
      this._updateWith(args);
    },

    /**
     * Bulk update this file object with the data provided.
     *
     * @private
     * @param {object} source Object with data to overwrite onto this File
     */
    _updateWith: function(source) {
      if (source) {
        if (source.name) { this.name = source.name; }
        if (source.key) {
          this.key = source.key;
          this.url = this.urlProtocol + source.key;
        }

        // convert dates from epoch seconds
        if (source.created) { this.created = new Date(source.created * 1000); }
        if (source.modified) { this.modified = new Date(source.modified * 1000); }

        if (source.type) {
          this.mimeType = source.type;

          this.type = source.type.substring(source.type.indexOf("/")+1);
        }
        if (source.appName) { this.appName = source.appName; }
        if (source.appId) { this.appId = source.appId; }
        if (source.hasOwnProperty("size")) { this.size = source.size; }
      }
      return this;
    },

    /**
     * Fetch the contents of the file.
     *
     *      file.getContents().then(function(contents) {
     *          // do something with the contents
     *      });
     *
     * @return {Ext.space.Promise} Promise that resolves when the contents are fetched
     *
     * @alias Ext.space.Collection.get
     */
    getContents: function() {
      return this.collection.loadContents(this.key, this);
    },

    /**
     * Write contents to the file.
     *
     *      file.setContents(contents).then(function() {
     *          // success
     *      });
     *
     * @param {String} contents File contents to write
     * @return {Ext.space.Promise} Promise that resolves when the contents are fetched
     *
     * @alias Ext.space.Collection.set
     */
    setContents: function(contents) {
      return this.collection.writeContents(this.key, contents);
    },

    /**
     * Remove this file from disk.
     *
     *      file.remove().then(function(success) {
     *          // success?
     *      });
     *
     * @return {Ext.space.Promise} Promise that resolves when the file is removed
     *
     * @alias Ext.space.Collection.remove
     */
    remove: function() {
      return this.collection.removeFile(this.key);
    },

    /**
     * Open the native viewer for this file.
     *
     *      file.view().then(function() {
     *          // launched
     *      });
     *
     * @return {Ext.space.Promise} Promise that resolves when the viewer is launched
     *
     * @alias Ext.space.Collection.view
     */
    view: function() {
      return this.collection.viewFile(this.key);
    },

    /**
     * Upload the file to a form handler.
     *
     *      file.upload({
     *          url: "...",
     *          fileFieldName: "...",
     *          params: { // optional extra POST data
     *              param1: "...",
     *              param2: "..."
     *          },
     *          headers: { // optional request headers
     *              header1: "...",
     *              header2: "..."
     *          }
     *      }).then(function(response) {
     *          // inspect the response if you like:
     *          // response.statusCode, .headers, .body
     *      });
     *
     * @param {Object} args Upload parameters
     * @param {String} args.url The URL where the file will be posted.
     * @param {String} args.fileFieldName The post field name to assign the file to.
     * @param {Object} args.params Optional POST parameters to be sent along with the file.
     * @param {Object} args.headers Optional http headers to be sent along with the file.

     * @return {Ext.space.Promise} Promise that resolves when the file is uploaded
     */
    upload: function(args) {
      var result = new Ext.space.Promise();

      var spec = { key: this.key };
      if (args) {
        spec.url = args.url;
        spec.fileFieldName = args.fileFieldName;
        spec.params = args.params;
        spec.headers = args.headers;
      }

      // TODO remove from 1.3; this is only here so the manager code can pass it back
      spec.file = this;

      Ext.space.Uploads.upload(spec).then(function(file, upload) {
        result.fulfill(file, upload);
      }, function(error) {
        result.reject(error);
      });

      return result;
    },

    /**
     * Compress the file into an archive.
     *
     *      file.compress({ archiveName: "somefiles.zip" }).then(function(archive) {
     *          // do something with the archive file
     *      });
     *
     *      // or specify more options:
     *      file.compress({
     *          archiveName: "somefile.gz",
     *          path: "myArchivePath",
     *          type: "gzip"
     *      }).then(function(archive) {
     *          // do something with the archive file
     *      });
     *
     * @param {Object} args Options object
     * @param {String} args.archiveName Name of the archive file to create
     * @param {String} args.path (optional) Path into which to save the archive; defaults to ""
     * @param {String} args.type (optional) Compression type ("zip", "gzip", "bzip2", "7zip");
     *                           if this is omitted, the system will attempt to determine
     *                           the compression type from the archiveName, and if it
     *                           cannot be determined, defaults to "zip".
     * @return {Ext.space.Promise} Promise that resolves with the Ext.space.files.File
     *                       object for the new archive.
     */
    compress: function(args) {
      var result = new Ext.space.Promise();

      if (!args) {
        result.reject("Missing compression arguments");

      } else if (!args.archiveName) {
        result.reject("Missing compressed archive name");

      } else {
        Ext.space.SecureFiles.compress({
          files: [this],
          archiveName: args.archiveName,
          path: args.path,
          type: args.type
        }).connect(result);
      }

      return result;
    },

    /**
     * Uncompress into file(s) in a particular path.
     *
     *      file.uncompress("somepath").then(function(files) {
     *          files.forEach(...); // do something with the new file(s)
     *      });
     *
     * @param {String} path (optional) Path into which to place uncompressed
     *                      file(s); defaults to ""
     * @return {Ext.space.Promise} Promise that resolves when the file is uncompressed.
     */
    uncompress: function(path) {
      var uncompressPath = "";
      var result = new Ext.space.Promise();

      // prior to version 6, we expected an object parameter with optional .path
      // and .type properties, so we need to unpack that here if that's what we get
      // (and we also completely ignore any specified encoding)
      if (path) {
        uncompressPath = (path.path || path.type) ? (path.path || "") : path;
      }

      Ext.space.Communicator.send({
        command: "Compression#uncompress",
        key: this.key,
        path: uncompressPath,
        callbacks: {
          onSuccess: function(metas) {
            var collection = Ext.space.SecureFiles.get(uncompressPath);
            var files = [];

            // turn them all into files
            metas.forEach(function(meta) {
              files.push(collection._cache(meta));
            });

            result.fulfill(files);
          },
          onError: function(error) {
            result.reject(error);
          }
        }
      });

      return result;
    }
  });


})();

/**
 * The Download class which is used to represent a downloading file. It's a promise-
 * like object that also supports a simple event interface for providing progress
 * notifications. You normally don't create these yourself; they're the objects
 * returned by the Download API:
 *
 *      var download = Ext.space.Downloads.download({ url: "http://example.com/" });
 *
 *      // get the File object (and the completed Download object)
 *      download.then(function(file, finishedDownload) {
 *          // do something with the file
 *          Ext.space.Logger.log(file instanceof Ext.space.files.File); // true
 *          Ext.space.Logger.log(finishedDownload instanceof Ext.space.files.Download); // true
 *      });
 *
 *      // get progress updates
 *      download.on("progress", function(updatedDownload) {
 *          // inspect the latest data
 *      });
 *
 *      // cancel the download
 *      download.cancel().then(function() {
 *          // done
 *      });
 *
 */
Ext.define("Ext.space.files.Download", {
  extend: Ext.space.files.Transfer,

  /**
   * @private
   */
  manager: Ext.space.Downloads,

  /**
   * @private
   */
  idField: "downloadId",

  /**
   * Internal identifier for this download
   * @type {String}
   */
  downloadId: null,

  /**
   * MIME type
   * @type {String}
   */
  mimeType: null,

  /**
   * @private
   */
  bytesTransferredField: "bytesDownloaded",

  /**
   * Progress so far
   * @type {Number}
   */
  bytesDownloaded: 0,

  /**
   * Whether the file is moved from the temporary download storage
   * @type {Boolean}
   */
  isVolatile: true,

  /**
   * Destination file path/name
   * @type {String}
   */
  fileName: null,

  /**
   * @private
   */
  constructor: function(args) {
    Ext.space.files.Download.superclass.constructor.apply(this, [args]);
  },

  /**
   * Bulk update this download with the data provided.
   *
   * @private
   * @param {object} source Object with data to overwrite onto this Download
   */
  _updateWith: function(source) {
    if (source) {
      if (source.mimeType) { this.mimeType = source.mimeType; }
      if (source.fileName) { this.fileName = source.fileName; }
      if (source.hasOwnProperty("isVolatile")) { this.isVolatile = source.isVolatile; }
    }
    return Ext.space.files.Download.superclass._updateWith.apply(this, arguments);
  }
});

/**
 * The Upload class which is used to represent a uploading file. It's a promise-
 * like object that also supports a simple event interface for providing progress
 * notifications. You normally don't create these yourself; they're the objects
 * returned by the Upload API:
 *
 *      var upload = Ext.space.Uploads.upload({
 *          url: "http://example.com/uploadHandler",
 *          fileFieldName: "exampleField",
 *          params: {field1: "foo"}, // optional extra form fields
 *          headers: {"x-example-app": "testing123"} // optional request headers
 *      });
 *
 *      // get the File object (and the completed Upload object)
 *      upload.then(function(file, finishedUpload) {
 *          // do something with the file
 *          Ext.space.Logger.log(file instanceof Ext.space.files.File); // true
 *          Ext.space.Logger.log(finishedUpload instanceof Ext.space.files.Upload); // true
 *      });
 *
 *      // get progress updates
 *      upload.on("progress", function(updatedUpload) {
 *          // inspect the latest data
 *      });
 *
 *      // cancel the upload
 *      upload.cancel().then(function() {
 *          // done
 *      });
 *
 */
Ext.define("Ext.space.files.Upload", {
  extend: Ext.space.files.Transfer,

  /**
   * @private
   */
  manager: Ext.space.Uploads,

  /**
   * @private
   */
  idField: "uploadId",

  /**
   * Internal identifier for this upload
   * @type {String}
   */
  uploadId: null,

  /**
   * @private
   */
  bytesTransferredField: "bytesUploaded",

  /**
   * Progress so far
   * @type {Number}
   */
  bytesUploaded: 0,

  /**
   * Server response from the upload (.statusCode, .headers, .body)
   * @type {Object}
   */
  response: null,

  /**
   * @private
   */
  constructor: function(args) {
    Ext.space.files.Upload.superclass.constructor.apply(this, args);
  },

  /**
   * Bulk update this upload with the data provided.
   *
   * @private
   * @param {object} source Object with data to overwrite onto this Upload
   */
  _updateWith: function(source) {
    if (source) {
      if (source.response) { this.response = source.response; }
    }
    return Ext.space.files.Upload.superclass._updateWith.apply(this, arguments);
  }
});

/**
 * Ext.space.Fullscreen is an API for entering and leaving fullscreen mode.
 *
 * Sencha applications can make more screen space available by entering fullscreen
 * mode. Doing so is simple:
 *
 *      Ext.space.Fullscreen.enter().then(function() {
 *          // done entering fullscreen mode
 *      });
 *
 * Leaving fullscreen mode is similarly simple:
 *
 *      Ext.space.Fullscreen.leave().then(function() {
 *          // done leaving fullscreen mode
 *      });
 *
 * The Space Web Application Client allows the user to toggle fullscreen mode via
 * gesture input, so the Fullscreen module provides a hook you can use to add your
 * own listeners to the toggling process. Custom listeners fire on all fullscreen
 * toggle events, regardless of their source (gesture, `enter()`/`leave()`, etc...):
 *
 *      Ext.space.Fullscreen.onToggle(function(isFullscreen) {
 *          if (isFullscreen) {
 *              // something...
 *          } else {
 *              // another thing...
 *          }
 *      });
 *
 * Outside an `onToggle` handler, you can inspect the current fullscreen status with
 * a simple property check:
 *
 *      Ext.space.Fullscreen.ready().then(function() {
 *          if (Ext.space.Fullscreen.isEnabled) {
 *              // in fullscreen mode
 *          }
 *      });
 *
 * Note that the `isEnabled` property doesn't become reliable until shortly after the
 * main `Ext.onSpaceReady()` promise fulfills; the Fullscreen module uses its own
 * promise for notifying application code that it's ready to go, so if you need to
 * check the fullscreen status early in the application's lifecycle, you'll want to
 * wrap the check in a `ready()` handler, as above. In other cases, simply checking
 * the property directly works fine.
 *
 */
Ext.define("Ext.space.Fullscreen", {
  extend: Ext.space.Observable,

  singleton: true,

  /**
   * Whether or not fullscreen mode is currently enabled
   * @readonly
   * @type {boolean}
   */
  isEnabled: false,

  /**
   * @private
   */
  _ready: null,

  /**
   * @private
   */
  constructor: function() {
    Ext.onSpaceReady().then(function() {
      Ext.space.Fullscreen.superclass.constructor.apply(this, arguments);
      this.init();
    }.bind(this));
  },

  /**
   * @private
   */
  init: function() {
    var fullscreen = this;

    // check the mode we're starting in
    var checkReady = new Ext.space.Promise();
    Ext.space.Communicator.send({
      command: "Fullscreen#isFullscreen",
      callbacks: {
        onSuccess: function(isFullscreen) {
          fullscreen.isEnabled = isFullscreen;
          checkReady.fulfill();
        },
        onError: function() {
          // just assume we're not in fullscreen mode and carry on
          fullscreen.isEnabled = false;
          checkReady.fulfill();
        }
      }
    });

    // listen for externally generated fullscreen togglings
    var handlerReady = new Ext.space.Promise();
    Ext.space.Communicator.send({
      command: "Fullscreen#registerHandler",
      callbacks: {
        onToggle: this._onToggle.bind(this),
        onSuccess: function() {
          handlerReady.fulfill();
        }
      }
    });

    this._ready = Ext.space.Promise.when(checkReady, handlerReady);

    return this._ready;
  },

  /**
   * Callback that fires when the application changes to/from fullscreen mode
   *
   * @private
   * @param {boolean} isFullscreen true if the application is now in fullscreen mode; false if not
   */
  _onToggle: function(isFullscreen) {
    this.isEnabled = isFullscreen;
    this.invokeListeners(isFullscreen);
  },

  /**
   * Check to see if the Fullscreen module is ready for use.
   *
   * @return {Ext.space.Promise} Promise that resolves when the module is ready.
   */
  ready: function() {
    return this._ready;
  },

  /**
   * Enter fullscreen mode
   *
   *      Ext.space.Fullscreen.enter().then(function(){
     *          // do something
     *      });
   *
   * @return {Ext.space.Promise} Promise that resolves when the application has entered fullscreen mode
   *
   */
  enter: function() {
    var result = new Ext.space.Promise();
    var fullscreen = this;

    this._ready.then(function() {
      Ext.space.Communicator.send({
        command: "Fullscreen#enter",
        callbacks: {
          onSuccess: function() {
            result.fulfill();
          },
          onError: function(error) {
            result.reject("Error entering fullscreen mode");
          }
        }
      });
    });

    return result;
  },

  /**
   * Leave fullscreen mode
   *
   *      Ext.space.Fullscreen.leave().then(function(){
     *          // do something
     *      });
   *
   * @return {Ext.space.Promise} Promise that resolves when the application has left fullscreen mode
   *
   */
  leave: function() {
    var result = new Ext.space.Promise();
    var fullscreen = this;

    this._ready.then(function() {
      Ext.space.Communicator.send({
        command: "Fullscreen#leave",
        callbacks: {
          onSuccess: function() {
            result.fulfill();
          },
          onError: function(error) {
            result.reject("Error leaving fullscreen mode");
          }
        }
      });
    });

    return result;
  },

  /**
   * Register a callback to run when the application changes into and out of
   * fullscreen mode.
   *
   * The callback will be passed a single parameter, a boolean value indicating
   * whether or not fullscreen mode is currently active (the callback runs after
   * the mode change is finished, so e.g., a value of `true` indicates that the
   * application has switched into fullscreen mode).
   *
   *      function switcheroo(isFullscreen) {
     *          Ext.space.Logger.log("Fullscreen switched; now " + (isFullscreen ? "on" : "off"));
     *      }
   *
   *      Ext.space.Fullscreen.onToggle(switcheroo);
   *      Ext.space.Fullscreen.enter(); // logs "Fullscreen switched; now on"
   *      Ext.space.Fullscreen.leave(); // logs "Fullscreen switched; now off"
   *
   *
   * @param {Function} callback Callback to fire when the application changes to or
   *                            from fullscreen mode.
   */
  onToggle: function(callback) {
    this.addListener.apply(this, arguments);
  }
});


/**
 * Ext.space.Barcode is an API for scanning barcodes in various encodings.
 *
 * The API consists of a single function allowing applications to scan multiple
 * codes in sequence. The sequence is then decoded, and the decoded data are used to
 * fulfill the promise returned by the API:
 *
 *      Ext.space.Barcode.scan().then(function(decodedData) {
 *          // loop through the items in `decodedData` to get each value
 *      });
 *
 */
Ext.define("Ext.space.Barcode", {
  singleton: true,

  /**
   * Scan a series of one or more codes.
   *
   * @return {Ext.space.Promise} Promise that resolves when the decoded data is all ready
   */
  scan: function(type) {
    var result = new Ext.space.Promise();

    Ext.space.Communicator.send({
      command: "Barcode#scan",
      callbacks: {
        onSuccess: function(data) {
          result.fulfill(data);
        },
        onError: function(error) {
          result.reject(error);
        }
      }
    });

    return result;
  }
});


/**
 * Ext.space.Applications is an API that lets applications retrieve information about
 * an organization's other applications.
 *
 * To fetch a list of applications, use the .list() method:
 *
 *      Ext.space.Applications.list().then(function(list) {
 *          list.forEach(function(app) {
 *              // do something with the app object; for example, to open them all:
 *              Ext.space.Applications.open(app);
 *          });
 *      });
 *
 * The API also allows applications to listen for updates to the list of applications
 * and run a callback in response:
 *
 *      Ext.space.Applications.onUpdate(function(reason, operation, list) {
 *          // process the list when it changes (`reason` and `operation` are hints)
 *      });
 *
 * Additionally, the API allows applications to listen for badge/alert/data
 * notifications being pushed to <i>any</i> application in the organization (as
 * opposed to Ext.space.Notification, which listens for notifications for the
 * current application only). This is useful for creating administration dashboards
 * that need to display data from multiple applications simultaneously.
 */
Ext.define("Ext.space.Applications", {
  extend: Ext.space.Observable,

  singleton: true,

  /**
   * @private
   */
  events: null,

  /**
   * @private
   */
  _listeningForNotifications: false,

  /**
   * Whether or not the module is watching the list for changes
   * @readonly
   * @private
   * @type {boolean}
   */
  _watchingList: false,

  /**
   * @private
   */
  constructor: function() {
    this.events = {
      badge: new Ext.space.Observable(),
      alert: new Ext.space.Observable(),
      data: new Ext.space.Observable()
    };

    var args = Array.prototype.slice.call(arguments);
    Ext.onSpaceReady().then(function() {
      Ext.space.Applications.superclass.constructor.apply(this, args);
    }.bind(this));
  },

  /**
   * Listen for changes to the applications list
   * @private
   */
  _watchList: function() {
    if (!this._watchingList) {
      Ext.space.Communicator.send({
        command: "Applications#watchList",
        callbacks: {
          onSuccess: this._onUpdate.bind(this)
        }
      });

      this._watchingList = true;

      // TODO: when Observable gets the ability to remove listeners, unwatch when
      //       there are no more listeners left
    }
  },

  /**
   * Callback that fires when the application list changes
   *
   * @private
   * @param {string} reason The thing that changed (categories, applications, etc...)
   * @param {string} operation The type of change (add, remove, update)
   * @param {Array} list List of objects containing the current applications list
   */
  _onUpdate: function(reason, operation, list) {
    this.invokeListeners(reason, operation, list);
  },

  /**
   * Retrieve the current organization's applications list
   *
   * @return {Ext.space.Promise} Promise that resolves with the list
   */
  list: function() {
    var result = new Ext.space.Promise();

    Ext.space.Communicator.send({
      command: "Applications#list",
      callbacks: {
        onSuccess: function(apps) {
          // TODO: determine how much else to transform these, if at all
          //       (e.g., remove 'deleted', convert dates to objects, etc...)
          result.fulfill(apps.map(function(app) {
            return new Ext.space.applications.Application(app);
          }));
        },
        onError: function(error) {
          result.reject(error);
        }
      }
    });

    return result;
  },

  /**
   * Open an application.
   *
   * @param {Object|string} app The application object or application ID
   * @return {Ext.space.Promise} Promise that resolves when the app is launched
   */
  open: function(app) {
    var result = new Ext.space.Promise();

    if (app) {
      Ext.space.Communicator.send({
        command: "Applications#open",
        id: app.id || app,
        callbacks: {
          onSuccess: function() {
            result.fulfill();
          },
          onError: function(error) {
            result.reject(error);
          }
        }
      });

    } else {
      result.reject("Cannot open application; no ID provided.");
    }

    return result;
  },

  /**
   * Register a callback to run when the application list changes in some way.
   *
   * The callback will be passed a three parameters, a string indicating the
   * reason for the callback being invoked ("categories", etc...), a
   * string indicating the operation that happened (such as "add", "remove",
   * "update"), and an array of objects representing the current state of the
   * applications list itself.
   *
   *      function onListUpdate(reason, operation, list) {
     *          Ext.space.Logger.log("Updated: ", reason, operation);
     *          // do something with the items in `list`...
     *      }
   *
   *      Ext.space.Applications.onUpdate(onListUpdate);
   *
   * @param {Function} callback Callback to fire when the application list changes.
   */
  onUpdate: function(callback) {
    var args = Array.prototype.slice.call(arguments);
    Ext.onSpaceReady().then(function() {
      if (!this._watchingList) {
        this._watchList();
      }
      this.addListener.apply(this, args);
    }.bind(this));
  },

  /**
   * Start listening for push notifications for all apps in the current organization.
   *
   * @private
   */
  _listenForNotifications: function() {
    this._listeningForNotifications = true;
    Ext.onSpaceReady().then(function() {
      Ext.space.Communicator.send({
        command: "Notification#registerHandler",
        callbacks: {
          onGlobalBadgeChange: this._onBadgeChange.bind(this),
          onGlobalAlertReceived: this._onAlert.bind(this),
          onGlobalDataReceived: this._onData.bind(this),
          onSuccess: function() { /* no need to do anything */ }
        }
      });
    }.bind(this));
  },

  /**
   * Callback that fires when any application's badge has changed.
   *
   * @private
   * @param {object} change object containing the application ID and the new
   *                        badge's value: {appId: "...", badgeValue: "..."}
   */
  _onBadgeChange: function(change) {
    this.events.badge.invokeListeners(change.appId, change.badgeValue);
  },

  /**
   * Register a callback to run when any application's badge has changed, across
   * all applications in the current organization.
   *
   * function onBadgeChanged(appId, badge) {
     *      Ext.space.Logger.log("New Badge (" + appId + "): " + badge);
     * }
   *
   * Ext.space.Applications.onBadgeChange(onBadgeChanged);
   *
   * @param {Function} callback Callback for when any application's badge has changed.
   */
  onBadgeChange: function(callback) {
    if (!this._listeningForNotifications) {
      this._listenForNotifications();
    }
    this.events.badge.addListener(callback);
  },

  /**
   * Callback that fires when an alert is received by any application in the
   * current organization.
   *
   * @private
   * @param {object} change object containing the application ID and the alert
   *                        object: {appId: "...", alert: "..."}
   */
  _onAlert: function(change) {
    this.events.alert.invokeListeners(change.appId, change.alert);
  },

  /**
   * Register a callback to run when an alert is received for any application in
   * the current organization.
   *
   * function onAlertReceived(appId, alert) {
     *      Ext.space.Logger.log("New alert (" + appId + "): " + alert.message);
     *      // alert.icon string of the icon
     *      // alert.tags contains an array of tags
     * }
   *
   * Ext.space.Applications.onAlert(onAlertReceived);
   *
   * @param {Function} callback Callback for when an alert is received by any application.
   */
  onAlert: function(callback) {
    if (!this._listeningForNotifications) {
      this._listenForNotifications();
    }
    this.events.alert.addListener(callback);
  },

  /**
   * Callback that fires when data is received for any application in the current
   * organization.
   *
   * @private
   * @param {string} change object containing the application ID and the data
   *                        string: {appId: "...", data: "..."}
   */
  _onData: function(change) {
    this.events.data.invokeListeners(change.appId, change.data);
  },

  /**
   * Register a callback to run when data is received by any application in the
   * current organization.
   *
   * function onDataReceived(appId, data) {
     *      Ext.space.Logger.log("Data (" + appId + "): " + data);
     * }
   *
   * Ext.space.Applications.onData(onDataReceived);
   *
   * @param {Function} callback Callback for when data is received by any application.
   */
  onData: function(callback) {
    if (!this._listeningForNotifications) {
      this._listenForNotifications();
    }
    this.events.data.addListener(callback);
  }
});


/**
 * The Application class which is used to represent an application.
 */
Ext.define("Ext.space.applications.Application", {


  /**
   * Application Name
   * @readonly
   * @type {String}
   */
  name: null,

  /**
   * The URL to the application's icon
   * @readonly
   * @type {String}
   */
  icon: null,

  /**
   * The URL to the application's icon
   * @readonly
   * @type {String}
   */
  icon: null,


  /**
   * Is this application protected by a VPN.
   * If it is, then this property will be object containing the name and type of the VPN
   * @readonly
   * @type {Object}
   */
  vpn: null,

  /**
   * The URL to the application
   * @readonly
   * @type {String}
   */
  url: null,

  /**
   * @private
   */
  constructor: function(props) {
    // just pull in everything
    for (var p in props) {
      if (props.hasOwnProperty(p)) {
        this[p] = props[p];
      }
    }
  },

  /**
   * Open this application.
   *
   * @return {Ext.space.Promise} Promise which will fulfills when the application is
   *                       successfully launched.
   */
  open: function() {
    return Ext.space.Applications.open(this);
  }
});

/**
 * User and Device and Org Profile.
 * The properties of this Object will be null until after Ext.onSpaceReady fires.
 *
 *
 Ext.onSpaceReady().then(
 function() {
            Ext.space.Logger.log("current username", Ext.space.Profile.user.userId);
        }
 );
 *
 */
Ext.define("Ext.space.Profile", {
  singleton: true,


  /**
   * Details on the device including the unique id, name, and platform
   * @readonly
   * @type {Ext.space.profile.Device}
   */
  device: null,

  /**
   * Details about the current Sencha user
   * @readonly
   * @type {Ext.space.profile.User}
   */
  user: null,

  /**
   * The organization detail this app belongs to.
   * @readonly
   * @type {Ext.space.profile.Org}
   */
  org: null,

  /**
   * @private
   */
  constructor: function() {
    Ext.onSpaceReady().then(this.init.bind(this));
  },

  init: function() {
    var device = Ext.space.Communicator.device;
    var session = Ext.space.Communicator.session;

    this.device = new Ext.space.profile.Device(device);
    this.user  = new Ext.space.profile.User(session);
    this.org = new Ext.space.profile.Org(session);

  }

});


/**
 * Device Profile information.
 * Created by Ext.space.Profile
 */
Ext.define("Ext.space.profile.Device", {

  /**
   * Device Name
   * @readonly
   * @type {String}
   */
  name: null,

  /**
   * The platform/manufacturer of the device.
   * @readonly
   * @type {String}
   */
  platform: null,


  /**
   * The vendor specific unique identifier of the device.
   * @readonly
   * @type {String}
   */
  uuid: null,

  /**
   * @private
   */
  constructor: function(props) {
    this.name = props.name;
    this.platform = props.platformName;
    this.uuid = props.uuid;
  },

});


/**
 * User Profile information.
 * Created by Ext.space.Profile
 */
Ext.define("Ext.space.profile.User", {

  /**
   * User ID
   * @readonly
   * @type {String}
   */
  userId: null,

  /**
   * @private
   */
  constructor: function(props) {
    this.userId = props.userId;
  },

});

/**
 * Device Profile information.
 * Created by Ext.space.Profile
 */
Ext.define("Ext.space.profile.Org", {

  /**
   * Org Name
   * @readonly
   * @type {String}
   */
  name: null,

  /**
   * @private
   */
  constructor: function(props) {
    this.name = props.org;
  },

});

/**
 * Ext.space.Focus is an API that lets applications register a callback function
 * that fires when the application switches foreground and background and back.
 *
 * To register a callback:
 *
 *      Ext.space.Focus.onToggle(function(isForeground) {
 *          if (isForeground) {
 *              // something...
 *          } else {
 *              // something else...
 *          }
 *      });
 *
 */
Ext.define("Ext.space.Focus", {
  extend: Ext.space.Observable,

  singleton: true,

  /**
   * @private
   */
  constructor: function() {
    Ext.onSpaceReady().then(function() {
      Ext.space.Focus.superclass.constructor.apply(this, arguments);
      this.init();
    }.bind(this));
  },

  /**
   * @private
   */
  init: function() {
    // listen for toggling to/from foreground/background
    Ext.space.Communicator.send({
      command: "ApplicationFocus#registerHandler",
      callbacks: {
        onApplicationFocusChange: this._onToggle.bind(this),
        onSuccess: function() { /* no need to do anything */ }
      }
    });

    // TODO: when Observable gets the ability to remove listeners, call
    //       removeHandler when there are no more listeners left
  },

  /**
   * Callback that fires when the application changes to/from fullscreen mode
   *
   * @private
   * @param {boolean} isForeground true if the application is now in fullscreen mode; false if not
   */
  _onToggle: function(isForeground) {
    this.invokeListeners(isForeground);
  },

  /**
   * Register a callback to run when the application moves from the foreground to
   * the background, or vice versa.
   *
   * The callback will be passed a single parameter, a boolean value indicating
   * whether or not the application is now in the foreground (the callback runs
   * after the mode change is finished, so e.g., a value of `true` indicates that
   * the application has switched into fullscreen mode).
   *
   *      function onFocusChanged(isForeground) {
     *          Ext.space.Logger.log("Application focus switched; now " +
     *                      (isForeground ? "foreground" : "background"));
     *      }
   *
   *      Ext.space.Focus.onToggle(onFocusChanged);
   *
   * @param {Function} callback Callback to fire when the application changes from
   *                            foreground to background or vice versa.
   */
  onToggle: function(callback) {
    this.addListener.apply(this, arguments);
  }
});


(function() {

  /**
   * Ext.space.Window is an API that allows you to create child web views and do
   * simple management with them (e.g., open, close, navigate).
   *
   * To create a child web view:
   *
   *      var child = window.open("http://example.com/");
   *
   *      child.open("http://another.example.com/somewhere/somehow.html");
   *      // ... later:
   *      child.close();
   *
   *      // close all open children
   *      Ext.space.Window.closeAll();
   *
   */
  Ext.define("Ext.space.Window", {
    singleton: true,

    /**
     * Internal collection of child web views, by name
     *
     * @type {Object}
     * @private
     */
    namedWindows: null,

    /**
     * Internal collection of child web views, by ID
     *
     * @type {Object}
     * @private
     */
    windows: null,

    /**
     * @private
     */
    _ready: null,

    /**
     * @private
     */
    constructor: function() {
      this.namedWindows = {};
      this.windows = {};
      this._ready = new Ext.space.Promise();
      Ext.onSpaceReady().then(this.init.bind(this));
    },

    /**
     * @private
     */
    init: function() {
      // populate our list, in case we reloaded the app after creating some children
      this.getChildren().then(function(children) {
        this._ready.fulfill();
      }.bind(this));

      return this._ready;
    },

    /**
     * Transform from a window.open()-style comma separated string of features to
     * a regular object hash.
     *
     * It turns something like "foo=bar,spam=eggs" into {foo: "bar", spam: "eggs"},
     * but note that it doesn't normalize different styles of boolean values, so,
     * e.g., "true", "TRUE", "on", 1, etc. don't all get turned to a boolean true
     * or anything like that.
     *
     * @private
     * @param {String|Object} featuresString Comma separated features string, or an
     *                                       object hash that will be passed through unmodified.
     * @return {Object} Object hash version of the features specified.
     */
    _featuresToObject: function(featuresString) {
      var features, vars;

      if (!featuresString) {
        // default features is just empty
        features = {};

      } else if (typeof featuresString == "string") {
        // convert it to an object; note that we currently don't bother
        // normalizing variations like "on", "true", 1, etc., into standardized
        // boolean values
        features = {};
        vars = featuresString.split(",").map(function(s) { return s.split("="); });
        vars.forEach(function(prop) {
          features[prop[0]] = (prop.length > 1) ? prop[1] : true;
        });

      } else {
        // actually a hash already
        features = featuresString;
      }

      return features;
    },

    /**
     * Open a child web view.
     *
     * In Sencha Web Application Client, window.open() is aliased to this function,
     * so while you can call the explicitly namespaced version here, typically you
     * just do something like:
     *
     *     var child = window.open("http://example.com/");
     *
     * @param {String} url URL to open
     * @param {String} name (optional) Application-specific name to give the child
     *                      web view. Just like in a regular browser context, calling
     *                      window.open twice with the same name will reuse the same
     *                      child web view. Similarly, specifying the name as "_blank"
     *                      will always open a new child web view.
     * @param {String|Object} featuresStringOrObject Comma separated features string of the
     *                      form normally expected by window.open ("foo=bar,spam=eggs", etc...),
     *                      or an object hash containing the same information ({foo: "bar", spam: "eggs"}).
     * @return {Ext.space.window.Child} Child web view, or null if the URL was invalid.
     */
    open: function(url, name, featuresStringOrObject) {
      //
      // TODO: support animations, and document them above
      //
      var child, features, isNamed = false;

      if (url && typeof url == "string") {
        features = this._featuresToObject(featuresStringOrObject);
        isNamed = !!name && name != "_blank";

        if (isNamed && this.namedWindows[name]) {
          // window so named exists; reuse it
          child = this.namedWindows[name];
          this.navigate(child, url);
        } else {
          // create a new one
          child = new Ext.space.window.Child(url, isNamed ? name : null, features);

          // cache by name, if necessary
          if (isNamed) {
            this.namedWindows[name] = child;
          }

          // cache by id, once we have it
          child.getId().then(function() {
            this.windows[child.id] = child;
          }.bind(this));
        }

        return child;

      } else {
        return null;
      }
    },

    /**
     * Fetch an array of child web views currently open.
     *
     * @return {Ext.space.Promise} Promise that resolves with an array of Ext.space.window.Child objects
     */
    getChildren: function() {
      var result = new Ext.space.Promise();
      var self = this;
      Ext.space.Communicator.send({
        command: "ChildView#getChildWebViews",
        callbacks: {
          onSuccess: function(webviews) {
            result.fulfill(webviews.map(function(webview) {
              var id = ""+webview.tabId;
              if (!this.windows[id]) {
                // isn't cached; could be due to app reload or something;
                // we need to recreate the child
                var child = this.windows[id] = new Ext.space.window.Child(webview.url, webview.name, {id: id}, true);
                if (webview.name) {
                  this.namedWindows[webview.name] = child;
                }
              } else {
                // cached; update the URL to reflect the latest
                this.windows[id].url = webview.url;
              }
              return this.windows[id];
            }.bind(self)));
          },
          onError: function(error) {
            result.reject(error);
          }
        }
      });
      return result;
    },

    /**
     * Navigate the provided child web view to the given URL.
     *
     * @param {String|Ext.space.window.Child} childOrHandle Child web view, or ID thereof
     * @param {String} url URL to open
     * @return {Ext.space.Promise} Promise that resolves once the navigation operation is
     *                       dispatched; note that this is not the same thing as the
     *                       URL being completely loaded. For that, you need to add
     *                       a listener for the child view's 'loadstop' event.
     */
    navigate: function(childOrHandle, url) {
      var result = new Ext.space.Promise();
      var self = this;
      var handle = childOrHandle.hasOwnProperty("id") ? childOrHandle.id : childOrHandle;
      if (url) {
        Ext.space.Communicator.send({
          command: "ChildView#navigate",
          id: handle,
          url: url,
          callbacks: {
            onSuccess: function() {
              // if the tab isn't in our window registry, attempt to load it
              if (typeof self.windows[handle] === "undefined") {
                self.getChildren().then(function(children) {
                  if (typeof self.windows[handle] === "undefined") {
                    result.reject("Tab not found");
                  } else {
                    self.windows[handle].url = url;
                    result.fulfill();
                  }
                });
              } else {
                self.windows[handle].url = url;
                result.fulfill();
              }
            },
            onError: function(error) {
              result.reject(error);
            }
          }
        });
      } else {
        result.reject("Missing URL");
      }
      return result;
    },

    /**
     * Close the given child web view.
     *
     * @param {String|Ext.space.window.Child} childOrHandle Child web view, or ID thereof
     * @return {Ext.space.Promise} Promise that resolves when the child view is closed
     */
    close: function(childOrHandle) {
      var result = new Ext.space.Promise();
      var self = this;
      var handle = childOrHandle.hasOwnProperty("id") ? childOrHandle.id : childOrHandle;
      Ext.space.Communicator.send({
        id: handle,
        command: "ChildView#close",
        callbacks: {
          onSuccess: function() {
            var name = self.windows[handle].name;
            if (self.namedWindows[name]) {
              delete self.namedWindows[name];
            }
            delete self.windows[handle];
            result.fulfill();
          },
          onError: function(error) {
            result.reject(error);
          }
        }
      });
      return result;
    },

    /**
     * Close all open child web views.
     *
     * @return {Ext.space.Promise} Promise that resolves when the child views are all closed
     */
    closeAll: function() {
      var result = new Ext.space.Promise();
      var self = this;
      Ext.space.Communicator.send({
        command: "ChildView#closeAll",
        callbacks: {
          onSuccess: function() {
            self.namedWindows = {};
            self.windows = {};
            result.fulfill();
          },
          onError: function(error) {
            result.reject(error);
          }
        }
      });
      return result;
    }
  });


  /*
   * Override window.open to use Sencha Web Application Client's API
   *
   * (we currently just obliterate the original since we don't need it)
   */
  window.open = Ext.space.Window.open.bind(Ext.space.Window);

})();

/**
 * The class that represents a child window. It's basically a convenient way to
 * pass a child webview handle around. You normally don't instantiate these objects
 * manually, but rather get them from window.open() or Ext.space.Window.open():
 *
 *      var child = window.open("http://example.com/");
 *      Ext.space.Logger.log(child instanceof Ext.space.window.Child); // true
 *
 *      child.on("loadstop", function(evt) {
 *          // evt.url has finished loading; do something...
 *      });
 *
 *      // ... time passes ...
 *      child.close();
 *
 */
Ext.define("Ext.space.window.Child", {
  /**
   * Internal identifier for this web view
   *
   * @type {String}
   * @private
   */
  id: null,

  /**
   * URL specified at creation or when calling navigate(), or when a new URL is
   * successfully loaded into the web view.
   *
   * @type {String}
   * @private
   */
  url: null,

  /**
   * Application-defined name for this web view.
   *
   * @type {String}
   * @private
   */
  name: null,

  /**
   * Hash of features specified at the time of creation. So far, only openAnimation
   * and closeAnimation are supported.
   *
   * @type {Object}
   * @private
   */
  features: null,

  /**
   * Internal hash of web view event listeners, which application code hooks into.
   *
   * @type {Object}
   * @private
   */
  events: null,

  /**
   * Internal hash of callbacks for native web view events.
   *
   * @type {Object}
   * @private
   */
  apiListeners: null,

  /**
   * Promise which indicates that this object is ready for use (i.e., has been
   * assigned an ID).
   *
   * @type {Ext.space.Promise}
   * @private
   */
  initialized: null,

  /**
   * @private
   */
  constructor: function(url, name, features, skipCreate) {
    var me = this;

    var events = this.events = {
      loadstart: new Ext.space.Observable(),
      loadstop: new Ext.space.Observable(),
      loaderror: new Ext.space.Observable(),
      close: new Ext.space.Observable()
    };

    this.url = url;
    this.name = name;
    this.features = features;

    this.initialized = new Ext.space.Promise();
    this.apiListeners = {};

    if (!skipCreate) {
      // normal usage; create a native web view
      var command = {
        command: "ChildView#create",
        url: url,
        callbacks: {
          onSuccess: function(handle) {
            me.id = ""+handle;
            me.initialized.fulfill();
          },
          onError: function(error) {
            me.initialized.reject();
          }
        }
      };

      if (name) {
        command.name = name;
      }

      if (features) {
        if (features.openAnimation) {
          command.openAnimation = features.openAnimation;
        }
        if (features.closeAnimation) {
          command.closeAnimation = features.closeAnimation;
        }
      }

      Ext.space.Communicator.send(command);

    } else {
      // skip creation of the native object (useful for rebuilding after a refresh);
      // in this case, features.id should have the existing web view's ID
      if (features && features.id) {
        this.id = features.id;
        this.initialized.fulfill();
      } else {
        this.initialized.reject();
      }
    }

    this.on("loadstop", function(evt) {
      // try and keep the URL up to date as best we can
      if (evt && evt.url) {
        this.url = evt.url;
      }
    }.bind(this));
  },

  /**
   * Fetch the internal web view ID. Also useful as a guard to make sure the child
   * view is ready for use before doign too much with it.
   *
   * @return {Ext.space.Promise} Promise that resolves with the web view ID
   */
  getId: function() {
    return this.initialized.then(function() {
      return this.id;
    }.bind(this));
  },

  /**
   * Navigate the web view to the given URL.
   *
   * @alias Ext.space.window.Child.open
   */
  navigate: function(url) {
    return this.initialized.then(function() {
      return Ext.space.Window.navigate(this, url);
    }.bind(this));
  },

  /**
   * Navigate the web view to the given URL.
   *
   * @param {String} url The URL to open.
   * @return {Ext.space.Promise} Promise that resolves when the navigate operation is
   *                       dispatched; note that this is different from the URL
   *                       being completely loaded (listen for the 'loadstop' event
   *                       for that).
   */
  open: function(url) {
    return this.navigate(url);
  },

  /**
   * Close the web view.
   *
   * @return {Ext.space.Promise} Promise that resolves when the web view is closed.
   */
  close: function() {
    return this.initialized.then(function() {
      return Ext.space.Window.close(this);
    }.bind(this));
  },

  /**
   * Wire up event listeners for the web view.
   *
   * There are four events applications can listen for: 'loadstart' (loading from
   * a URL has begun), 'loadstop' (loading from a URL has finished), 'loaderror'
   * (an error occurred while loading), and 'close' (the web view is closing).
   *
   * @param {String} event Event name to listen for (loadstart, loadstop, loaderror, close)
   * @param {Function} callback Callback to invoke when the event fires
   */
  on: function(event, callback) {
    var events = this.events;
    var apiListeners = this.apiListeners;

    // allow "exit" as an alias for "close" (PhoneGap compatibility)
    if (event == "exit") {
      event = "close";
    }

    // only register events we support; otherwise just silently swallow it
    if (events[event]) {
      events[event].addListener(callback);
    }

    // make sure to register our own listeners with the native bridge, on demand;
    // these will invoke the listeners app code has registered in this.events.*
    function makeListener(registry, eventname) {
      return function(loadEvent) {
        registry[eventname].invokeListeners(loadEvent);
      };
    }

    if (!apiListeners[event]) {
      this.getId().then(function(id) {
        var cb = makeListener(events, event);
        Ext.space.Communicator.send({
          command: "ChildView#addEventListener",
          id: id,
          eventname: event,
          callbacks: {
            onEvent: cb,
            onSuccess: function() {
              // mark that we have it registered
              apiListeners[event] = cb;
            },
            onError: function() {}
          }
        });
      });
    }
  },

  /**
   * Shorthand method, same as calling .on('loadstart', callback).
   *
   * @param {Function} callback Function to invoke when the loadstart event fires
   */
  onloadstart: function(callback) {
    return this.on("loadstart", callback);
  },

  /**
   * Shorthand method, same as calling .on('loadstop', callback).
   *
   * @param {Function} callback Function to invoke when the loadstop event fires
   */
  onloadstop: function(callback) {
    return this.on("loadstop", callback);
  },

  /**
   * Shorthand method, same as calling .on('loaderror', callback).
   *
   * @param {Function} callback Function to invoke when the loaderror event fires
   */
  onloaderror: function(callback) {
    return this.on("loaderror", callback);
  },

  /**
   * Shorthand method, same as calling .on('close', callback).
   *
   * @param {Function} callback Function to invoke when the close event fires
   */
  onclose: function(callback) {
    return this.on("close", callback);
  },

  /**
   * Add a listener for the specified event. This is mostly an alias for the .on()
   * method, except that for compatibility with PhoneGap applications, 'exit' is
   * also supported as an alias for the 'close' event.
   *
   * @param {String} event Event name to listen for (loadstart, loadstop, loaderror, close/exit)
   * @param {Function} callback Callback to invoke when the event fires
   */
  addEventListener: function(event, callback) {
    return this.on.apply(this, arguments);
  }
});

/*global DEBUG */
(function() {
  window.__evaluate = function(base64Encoded) {
    var script = atob(base64Encoded);

    DEBUG && Ext.space.Logger.debug('[EVALUATE] ', script);

    setTimeout(function() {
      try {
        /*jshint -W061 */
        eval(script);
        /*jshint +W061 */
      } catch (e) {
        if (e.constructor !== Error) {
          DEBUG && Ext.space.Logger.error("[EVALUATE][ERROR] Failed evaluating script. Error: ", e.toString(), ". Script: ", script);
        } else {
          throw e;
        }
      }
    }, 1);
  };

  window.__evaluate_v2 = function(script) {
    DEBUG && Ext.space.Logger.debug('[EVALUATE] ', script);

    setTimeout(function() {
      try {
        /*jshint -W061 */
        eval(script);
        /*jshint +W061 */
      } catch (e) {
        if (e.constructor !== Error) {
          DEBUG && Ext.space.Logger.error("[EVALUATE][ERROR] Failed evaluating script. Error: ", e.toString(), ". Script: ", script);
        } else {
          throw e;
        }
      }
    }, 1);
  };

  function notifyNative() {
    Ext.space.Communicator.notifyReady();
  }

  if (Ext.isSpace || Ext.spaceIsWindowsPhone) {
    if (DEBUG && window != window.top) {
      // We're in a frame? Inject some things into the top level window so the
      // native client can invoke our callbacks; this is gross and only works
      // once (any other instances in other frames basically compete, and the
      // last one to do this injection wins). Additionally, injecting code
      // across frames like this is subject to the Same Origin Policy, so it's
      // really only useful when both apps are completely under the developers'
      // control. If your situation meets all of these criteria, *and* you're
      // actually interested in this ... you have my sympathy. :-)
      Ext.space.Logger.log("[BOOT][INJECT] Not in the top frame; injecting a callback handler by overwriting any existing Ext.space.Communicator in the top level environment)");

      // we're probably unnecessarily careful about avoiding overwriting
      // existing non-essential objects/properties here, but oh well
      if (!window.top.Ext) { window.top.Ext = {isSpace: Ext.isSpace}; }
      if (!window.top.Ext.space) { window.top.Ext.space = {}; }
      if (!window.top.Ext.space.Communicator) { window.top.Ext.space.Communicator = {}; }

      // iOS directly calls Ext.space.Communicator.invoke()
      window.top.Ext.space.Communicator.invoke = Ext.space.Communicator.invoke.bind(Ext.space.Communicator);

      // Android calls window.__evaluate() or window.__evaluate_v2()
      window.top.__evaluate = window.__evaluate.bind(window);
      window.top.__evaluate_v2 = window.__evaluate_v2.bind(window);

      // Desktop calls all of the above, but also Ext.space.Communicator.notifyReady()
      // and window.__space_communicator_send_hook__(). We also need to override
      // the SDK's own .doSend() method to look for the top-level send hook.
      window.top.Ext.space.Communicator.notifyReady = Ext.space.Communicator.notifyReady.bind(Ext.space.Communicator);
      if (!Ext.spaceIsBlackBerry && !Ext.spaceIsAndroid && !Ext.spaceIsWindowsPhone && !Ext.spaceIsIos) {
        Ext.space.Communicator.doSend = function() {
          if (window.top.__space_communicator_send_hook__) {
            window.top.__space_communicator_send_hook__.apply(this, arguments);
          }
        };
      }

    }
    if ('onReady' in Ext) {
      Ext.onReady(notifyNative);
    }
    else if (!Ext.spaceIsWindowsPhone && document.readyState.match(/interactive|complete|loaded/) !== null) {
      notifyNative();
    }
    else {
      window.addEventListener('DOMContentLoaded', notifyNative, false);
    }
  }
})();
