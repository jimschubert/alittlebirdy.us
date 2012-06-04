
/**
 * Module dependencies.
 */

var express = require('express'),
    everyauth = require('everyauth'),
    conf = require('./conf'),
    util = require('util'),
    Tweeter = require('tweeter');
   
    require('tweeter/lib/tweeter.lists')(Tweeter);
    require('tweeter/lib/tweeter.friends')(Tweeter);

var app = module.exports = express.createServer();
var RedisStore = require('connect-redis')(express);
var sessionStore;
if(process.env.NODE_ENV == "production" && process.env.REDISTOGO_URL) {
    var parse = require('url').parse;
    var redisToGo = parse(process.env.REDISTOGO_URL); 
    var auth = redisToGo.auth.split(':');
    sessionStore = new RedisStore({ 
        host: redisToGo.hostname,
        port: redisToGo.port,
        db: auth[0],
        pass: auth[1]
    });
    parse = null;
} else {
    sessionStore = new RedisStore;
}

var usersById = {},
    nextUserId = 0,
    usersByTwitId = { };

var addUser = function(source, sourceUser) {
  var user;
  if (arguments.length === 1) { // password
    user = sourceUser = source;
    user.id = ++nextUserId;
    return usersById[nextUserId] = user;
  } else { // no password
    user = usersById[++nextUserId] = { id: nextUserId};
    user[source] = sourceUser;
  }
  return user;
};

// Configuration
everyauth.twitter
    .consumerKey(conf.twitter.consumerKey)
    .consumerSecret(conf.twitter.consumerSecret)
    .findOrCreateUser(function(ses, accessToken, accessSecret, twitUser) {
        var user = usersByTwitId[twitUser.id] || (usersByTwitId[twitUser.id] = addUser('twitter', twitUser));
        return user;
    })
    .redirectPath('/manage');

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({ 
        store: sessionStore,
        secret: 'Have I got a secret for you!' 
    }) 
  );
  app.use(everyauth.middleware());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
  app.use(function(err, req, res, next) {
    if(err instanceof Restricted ) {
        res.render('index', { errors: [err.message] });
    } else { next(err); }
  });
});

app.configure('development', function(){
  everyauth.debug = false;
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
  app.all('/robots.txt', function(req,res) {
    res.send('User-agent: *\nDisallow: /', {'Content-Type': 'text/plain'});
  });
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
  app.all('/robots.txt', function(req,res) {
    res.send('User-agent: *', { 'Content-Type': 'text/plain' });
  });
});

// Template Helper, allows accessing session from templates
app.dynamicHelpers({
    tweeter : function(req,res) {
        return req.session.tweeter;
    }
});

// Errors
function NotFound(msg) {
    this.name = "NotFound";
    this.message = msg;
    Error.call(this, msg);
    Error.captureStackTrace(this, arguments.call);
}
NotFound.prototype.__proto__ = Error.prototype;

function Restricted(msg) {
    this.name = "Restricted";
    this.message = msg;
    Error.call(this, msg);
    Error.captureStackTrace(this, arguments.callee);
}
Restricted.prototype.__proto__ = Error.prototype;

function requiresLogin(msg) {
    var message = msg || "The page you requested requires you to login";
    return function(req, res, next) {
        var sess = req.session;
        if(!sess.auth || !sess.auth.loggedIn) {
            next(new Restricted(message));
        } else {
            next(); 
        }
    }
}

// Routes

app.all('/', function(req, res){
  res.render('index', {
    title: 'Welcome!'
  });
});

app.get('/manage', requiresLogin("Please login before doing that!"), function(req, res, next) {
//    console.log(auth.twitter.user);
    var tweeter = getTweeter(req); 

    tweeter.api.lists.lists(function(err,data) {
        screen_name: auth.twitter.user.screen_name
    }, function(err,data) {
        if(err) { 
            res.render('manage', { errors: err } ); 
        } else {    
            var d = JSON.parse(data);
            res.render('manage', { lists: d["lists"] });
        }
   });
});

app.post('/membersForList', requiresLogin("Please login before doing that!"), function(req, res, next) {
    var tweeter = getTweeter(req);

    req.body.cursor = -1;
    tweeter.api.lists.members(req.body, function(err,data) {
       res.json( JSON.parse(data) );
    });
});

app.post('/addUser', requiresLogin("Please login before doing that!"), function(req,res,next){
    var tweeter = getTweeter(req);
    var opt = {
        list_id: req.body.list_id,
        owner_id: req.session.auth.twitter.user.id,
        screen_name: req.body.screen_name
    };

    tweeter.api.lists.members_create(opt, function(err,data) {
        if(err) res.json({success: false});
        else res.json({ success: true, data: data });
    });
});

app.post('/removeUser', requiresLogin("Please login before doing that!"), function(req,res,next) {
    var tweeter = getTweeter(req);
    var opt = {
        list_id: req.body.list_id,
        owner_id: req.session.auth.twitter.user.id,
        screen_name: req.body.screen_name
    };

    tweeter.api.lists.members_destroy(opt, function(err,data) {
        if(err) res.json({success:false});
        else res.json({ success: true, data: data });
    });
});

app.get('/getFriends', requiresLogin("Please login before doing that!"), function(req,res,next) {
    var tweeter = getTweeter(req);
    var opt = {
        user_id: req.session.auth.twitter.user.id,
    };

    tweeter.api.friends.follower_ids(opt, function(err,data) {
        if(err) { 
            res.json({success:false});
        } else {
            tweeter.get('/1/users/lookup.json',
                { user_id: data},
            function(err, data) {
                res.json({ success: true, data: data });
            });
        }
    }); 
});

function getTweeter(req) {
    var auth = req.session.auth;
    var tweeter = req.session.tweeter || new Tweeter({
        consumerKey: conf.twitter.consumerKey,
        consumerSecret: conf.twitter.consumerSecret,
        accessToken: auth.twitter.accessToken,
        accessTokenSecret: auth.twitter.accessTokenSecret,
    });
    req.session.tweeter = tweeter;
    return tweeter;
}

everyauth.everymodule.moduleTimeout(-1);
everyauth.helpExpress(app);

app.listen(process.env.PORT || 8080);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
