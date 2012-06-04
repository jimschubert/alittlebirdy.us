var EventEmitter = require('events').EventEmitter,
    https = require('https'),
    http = require('http'),
    qs = require('querystring'),
    util = require('util'),
    crypto = require('crypto'),
    noop = function() { };

// extend method modified from underscore.js _.extend
//     Underscore.js 1.1.7
//     (c) 2011 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore is freely distributable under the MIT license.
//     Portions of Underscore are inspired or borrowed from Prototype,
//     Oliver Steele's Functional, and John Resig's Micro-Templating.
//     For all details and documentation:
//     http://documentcloud.github.com/underscore
function extend(obj) {
    [].slice.call(arguments, 0).forEach(function(source) {
        for (var prop in source) {
            if(source[prop] !== void 0) obj[prop] = source[prop];
        }
    });
    return obj;
}

var formatRegExp = /%[sdj%]/g;
util.format = util.format || function(f) {
  if (typeof f !== 'string') {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j': return JSON.stringify(args[i++]);
      case '%%': return '%';
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (x === null || typeof x !== 'object') {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
}

/**
 * Initialize the Twitter API 
 *
 * @param {Object} user
 * @api public
 */
var Tweeter = exports = module.exports = function Tweeter(opt) {
    this.consumerKey = opt.consumerKey;
    this.consumerSecret = opt.consumerSecret;
    this.oauthToken = opt.token;
    this.oauthSecret = opt.secret;

    this.accessToken = opt.accessToken;
    this.accessTokenSecret = opt.accessTokenSecret;

    this.verifier = opt.verifier;
    this.protocol = 'https://';
    this.apiBase = 'api.twitter.com';
    this.tokenSecret = opt.tokenSecret;
    this.everyauth = opt.everyauth;

    console.log('Consumer key: ' + this.consumerKey + '\n');
    console.log('Consumer secret: ' + this.consumerSecret + '\n');
    console.log('OAuth Token: ' + this.oauthToken + '\n');
    console.log('OAuth Secret: ' + this.oauthSecret + '\n');
    console.log('OAuth Verifier: ' + this.verifier + '\n');
    console.log('OAuth Token Secret: ' + this.tokenSecret + '\n');
    console.log('API Base: ' + this.apiBase + '\n');

    this.base = {
        host: this.apiBase,
        headers: {
            'Content-Type': 'application/json',
            'X-Target-URI': 'http://api.twitter.com',
            'Connection' : 'Keep-Alive'
        }
    };

    this.GET = { method: 'GET' };
    this.POST = { method: 'POST' };

    // TODO: Abstract out the call setup per api call
};

/**
 * prototype
 */
Tweeter.prototype = {
    request_token: function(opt, fn) {
        var self = this;
        if(typeof opt === 'function') {
            fn = opt;
            opt = { };
        }
        var query = qs.stringify(opt);
        var req = {
            path: '/oauth/request_token'
        };
        self.protocol = "https://";
        self.execute.call(this, extend(self.base, self.GET, req) , fn);
        return this;
    },

    home_timeline: function(opt, fn) {
        var self = this;
        if(typeof opt === 'function') {
            fn = opt;
            opt = { };
        }
        var query = qs.stringify(opt);
        var req = { 
            path: '/1/statuses/home_timeline.json' + 
            (query ? '?' + query : '')
        };
        self.protocol = "http://";
        self.execute.call(this,
            extend(self.base, self.GET, req) );
        return this;
    },

    public_timeline: function(opt, fn) {
        var self = this;
        if(typeof opt === 'function') {
            fn = opt;
            opt = { };
        }
        var query = qs.stringify(opt);
        var req = {
            path : '/1/statuses/public_timeline.json' + 
            (query ? '?' + query : '')
        };
        self.protocol = "http://";
        self.execute.call(this,
            extend(self.base, self.GET, req) );
        return this;
    },

    update_status: function(opt, fn) {
        var self = this;
        if(typeof opt === 'function') {
            fn = opt;
            opt = { };
        }
        var query = qs.stringify(opt);
        var req = {
            path: '/1/statuses/update.json' + 
            (query ? '?' + query : ''),
            port: 3001
        };
        self.apiBase = '127.0.0.1';
        self.protocol = "http://";
        self.execute.call(this, extend(self.base, self.POST, req) );
        return this;
    },
    
    verify_credentials: function(opt) {
        var self = this;
        var query = qs.stringify(opt);
        var req = {
            path: '/1/account/verify_credentials.json' +
            (query ? '?' + query : '')
        };
        self.protocol = "http://";
        self.execute.call(this, extend(self.base, self.GET, req) );
        return this;
    },

    execute: function(opt, fn) {
        var self = this, req;
        var path = opt.path.split('?');
        var oauthHeader = { Authorization : self.oauthHeader(opt.method, path[0], (path.length > 1 ? path[1] : null ) ) };
        extend(opt.headers, oauthHeader);

        console.log(opt.headers);

        if(! (typeof fn === 'function') ) {
            fn = noop;
        }

        // console.log("executing with headers: " + util.inspect(opt) );
        if(self.protocol === 'https://') {
            req = https.request(opt, function(res) {
                res.setEncoding('utf8');
                var httpsData = [];
                res.on('data', function(d) {
                    httpsData += d;
                    self.emit('data', d);
                });
                res.on('end', function() { 
                    fn.call(this, null, httpsData);
                    self.emit('end'); 
                });
            });
        } else {
            req = http.request(opt, function(res) { 
                res.setEncoding('utf8');
                // console.log('\nResponse Status:\n\t' + res.statusCode );
                // console.log('\nResponse Headers:\n\t' + JSON.stringify(res.headers) );
                var httpData = [];
                res.on('data', function(d) {
                    httpData += d;
                   self.emit('data', d);
                });
                res.on('end', function() { 
                    fn.call(this, null, httpData);
                    self.emit('end');
                });
            });
        }      
        // console.log('Our request object: ' + util.inspect(req) );
        req.on('error', function(err) { 
            fn.call(this, err, null);
            self.emit('error', err); 
        });     
        req.end();
    },
    
    oauthHeader: function(method, path, query, extraProps) {
        var d = new Date();
        var headerObj = {
            oauth_consumer_key: this.consumerKey,
            oauth_nonce: Math.ceil( (new Date()).getTime() / Math.random() ),
            oauth_signature_method: "HMAC-SHA1",
            oauth_timestamp: ''+ ( (d.getTime() - d.getMilliseconds()) / 1000),
            oauth_token: this.accessToken,
            oauth_version: "1.0"
        };
        extend(headerObj, extraProps);

        if( path.match(/\/oauth\//gi) ) {
            headerObj.oauth_callback = "/auth/twitter/callback";
        }

        var signature = this.oauthSignature(method, path, headerObj, query);
        headerObj.oauth_signature = qs.escape(signature);

        var header = 'OAuth realm="Twitter API",';
        var oauthParts = [];
        for (var h in headerObj) {
            oauthParts.push(h + '="'+ headerObj[h] + '"');
        }
        header += oauthParts.join(',');
    
        return header;
    },

    createSignatureBaseString: function(method, path, props, query) {
        var oauthProperties;
        if(props) {
            oauthProperties = [];
            if(query) oauthProperties.push(query);

            for(var key in props) {
                if(props[key]){
                    oauthProperties.push(
                        qs.escape(key)+'%3D'+qs.escape(props[key])
                    );
                }
            }
            oauthProperties.sort();
            console.log('Sorted array: ' +util.inspect(oauthProperties));
        }
          
        var sig = method + '&' + qs.escape(this.protocol+this.apiBase+path) + '&' + oauthProperties.join('%26');
        // console.log('\nSignature:\n\t'+sig+'\n\n');
        
        return sig;
    },
    
    oauthSignature: function(method, path, props, query) {
        var self = this;
        var composite = qs.escape(self.consumerSecret) + 
            '&' + qs.escape(self.accessTokenSecret);
        console.log('Composite: %s\nconsumerSecret: %s\ntokenSecret: %s\n', composite, self.consumerSecret, self.tokenSecret);
        var hmac = crypto.createHmac('sha1', new Buffer(composite) );

        var sig = self.createSignatureBaseString(method, path, props, query);
       console.log(sig)
        // var signature = new Buffer(sig).toString('base64');
        hmac.update(sig);
        var hmacDigest = hmac.digest('base64');
        console.log('HMAC-SHA1: %s\nHashing:%s\nSalt: %s\n', hmacDigest, sig, composite);
        return hmacDigest;
    }
};

/**
 * Inherit from `EventEmitter`.
 */
Tweeter.prototype.__proto__ = EventEmitter.prototype;
