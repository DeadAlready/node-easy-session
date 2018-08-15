[easy-session](https://github.com/DeadAlready/node-easy-session) is a session extension and middleware for express and
connect with the aim of providing few convenience functions and security features.

# Installation

    $ npm install easy-session

# NB! Breaking changes in v2

* Callbacks are no longer supported. Promises are used instead

# Usage

To use easy-session simply require the module and run the .main function with express or connect.
This will return the middleware to bind to the stack. It can easily be done with two lines:

	const express = require('express');
	const session = require('express-session');
	const cookieParser = require('cookie-parser');
	const easySession = require('easy-session'); // Require the module : line 1

	let app = express();

	app.use(cookieParser());
	app.use(session({
	    secret: 'keyboard cat',
	    resave: false,
	    saveUninitialized: true
	}));
	app.use(easySession.main(session)); // Bind the module : line 2

Or in Express v3

	const express = require('express');
	const easySession = require('easy-session'); // Require the module : line 1

	let app = express();

	app.use(express.cookieParser());
	app.use(express.session({secret: 'keyboard cat'});
	app.use(easySession.main(express)); // Bind the module : line 2

# Options

The middleware supports the following configuration object that can be sent as a second argument to the easySession.main
function

	{
		ipCheck: {boolean} // Defines if IP must be consistent during the session - defaults to true
		uaCheck: {boolean} // Defines if UA must be consistent during the session - defaults to true
		freshTimeout: {time in ms} // Time since last request still under the maxFreshTimeout
						// when the session is considered fresh - defaults to 5 minutes
		maxFreshTimeout: {time in ms} // Time after which the session is considered stale
						// no matter the activity
		rbac: {object or function} // optional, refer to easy-rbac
	}

The IP and UA (User Agent) checks are a method against session hijacking - if the IP or User Agent changes mid-session then
it is a good chance that the session has been hijacked. In which case it should be invalidated.

# Functions

easy-session adds the following extra functions to the Session object.

## login([role='authenticated'],[extend])

Function for logging the user in.
Regenerates the session and adds _loggedInAt to the session object.
Depending on the configuration also adds _ip and _ua for continuity checks.
`Session.setRole` is called with the specified role
If an extend object is added then the key:value pairs are added to the session.

	req.session.login()
		.then(() => //here we have a logged in session);

	req.session.login({userId: 10})
		.then(() => {
			//here we have a logged in session
			console.log(req.session.userId); // Will print 10;
		});

	req.session.login('admin', {userId: 10})
    .then(() => {
      //here we have a logged in session
      console.log(req.session.userId); // Will print 10;
    });


## logout()

Function for logging out the user.
Is just a proxy for session regeneration.

	req.session.logout()
		.then(() => // Here we have a logged out session);

## isGuest()

Function for checking if the user is a guest.
Returns true if logged out, false if logged in.

	if(!req.session.isGuest()) {
		// Logged in user
	}

## isLoggedIn([role])

Function for checking if the user is logged in.
Will return the opposite of isGuest();

	if(req.session.isLoggedIn()) {
		// Logged in user
	}

If a role is specified then it will also run `Session.hasRole` with the given role

## isFresh()

Function for checking if the logged in session is fresh or stale.
Returns true if fresh, false if stale.

	if(req.session.isFresh()) {
		// User has logged in recently - session is fresh
	}

## setRole(role)

Function for setting a role in the session.

	req.session.setRole('admin');

## getRole()

Function for returning a role from the session. Will return 'guest' if no role specified.

	const role = req.session.getRole();

## hasRole(role, [reverse])

Function for validating if the user has the specified role. Accepts string and array input

	if(req.session.hasRole('admin')) {
		// User is admin
	}
	
	if(req.session.hasRole(['admin', 'user'])) {
		// User is admin or user
	}
	
Also accepts second parameter which reverses the check.

	if(req.session.hasRole('admin', true)) {
		// User is not admin
	}
	
	if(req.session.hasRole(['admin', 'user'], true)) {
		// User is neither admin or user
	}
	
## hasNotRole(role)

Function for validating if a user does not have a specified role. Is equal to hasRole(role, true).

	if(req.session.hasNotRole('admin')) {
		// User is not admin
	}
	
	if(req.session.hasNotRole(['admin', 'user'])) {
		// User is neither admin or user
	}

## can(operation, [params])

*This function is available only if `rbac` configuration property was set.*
   
This function uses the `getRole` function of the session object to invoke `easy-rbac`. Will return promise.

	 app.get('/post/save', function (req, res, next) {
			req.session.can('post:save', {userId: 1, ownerId: 1})
			  .then(accessGranted => {
			    if(accessGranted) {
			      res.send('yes');
			      return;
		      }
		      res.sendStatus(403);
			  })
			  .catch(next);
	 });

# Middleware

Easy-session provides some middleware for easier session checking

## isLoggedIn([errorCallback])

Easy-session also provides an isLoggedIn to check if the user is logged in and handle it accordingly.
Usage:

	app.get('/restricted', easySession.isLoggedIn(), function (req, res, next) {
		// If the user reaches this then they are logged in.
		// Otherwise they get 401
	});

You can also set it before all validation routes

	app.all('*', easySession.isLoggedIn());

	app.get('/restricted', function (req, res, next) {
		// If the user reaches this then they are logged in.
    // Otherwise they get 401
	});

You can pass a custom error handler as well

	app.all('*', easySession.isLoggedIn(function (req, res, next) {
		// A user that is logged out will reach this.
		// Can handle unauthorized here.
	}));

## isFresh([errorCallback])

Returns a middleware to check if the user is logged in and the session is fresh.

	app.get('/restricted', easySession.isFresh(), function (req, res, next) {
    // If the user reaches this then they are logged in and session is fresh
    // Otherwise they get 401
	});

## checkRole(role, [errorCallback])

Returns a middleware to check if the user has a given role.

	app.get('/restricted', easySession.checkRole('admin'), function (req, res, next) {
    // If the user reaches this then they the 'admin' role
    // Otherwise they get 401
	});

### NB! As of 0.2 it does no longer check if user is logged in

In order to check for both you should use two middlewares together

	app.get('/restricted', 
		easySession.isLoggedIn()
		easySession.checkRole('admin'), 
		function (req, res, next) {
	    // If the user reaches this then they they are logged in and have the 'admin' role
	    // Otherwise they get 401
		});

##can(operation, [params(req, res) => Promise], [errorCallback(req, res, error)])

The easy-session-rbac also exposes a middleware factory `can`.

If `params` is a function then it will be invoked and once the promise it returns resolves it will call the rbac with the result as params.

If `errorCallback` is provided then it will be invoked if check fails, otherwise `res.sendStatus(403)` is invoked.

	// With no params
	app.get('/middleware/post/delete', esRbac.can('post:delete'), function (req, res, next) {
	  res.send('yes');
	});
	
	// With params function
	app.get(
	  '/middleware/post/save/:id', 
	  esRbac.can('post:save', async (req, res) => ({userId: 1, ownerId: +req.params.id})), 
	  function (req, res, next) {
	    res.send('yes');
	  }
	);
    
	// With errorCallback
	app.get(
	  '/middleware/post/delete', 
	  esRbac.can('post:delete', {}, function (req, res, err) {
	    console.log(err);
	    res.send('You are not authorized');
	  }), 
	  function (req, res, next) {
	    res.send('yes');
	  }
	);

## Changelog

* v2.0.2 - account for usage of req.session.destroy()

## License

The MIT License (MIT)
Copyright (c) 2014 Karl Düüna

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.