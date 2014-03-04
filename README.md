[easy-session](https://github.com/DeadAlready/node-easy-session) is a session extension and middleware for express and
connect with the aim of providing few convenience functions and security features.

# Installation

    $ npm install easy-session

# Usage

To use easy-session simply require the module and run the .main function with express or connect.
This will return the middleware to bind to the stack. It can easily be done with two lines:

	var express = require('express');
	var easySession = require('easy-session'); // Require the module : line 1

	var app = express();

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
	}

The IP and UA (User Agent) checks are a method against session hijacking - if the IP or User Agent changes mid-session then
it is a good chance that the session has been hijacked. In which case it should be invalidated.

# Functions

easy-session adds the following extra functions to the Session object.

## login([role='authenticated'],[extend], cb)

Function for logging the user in.
Regenerates the session and adds _loggedInAt to the session object.
Depending on the configuration also adds _ip and _ua for continuity checks.
`Session.setRole` is called with the specified role
If an extend object is added then the key:value pairs are added to the session.

	req.session.login(function (err) {
		if(!err) {
			// Here we have a logged in session
		}
	});

	req.session.login({userId: 10}, function (err) {
	  if(!err) {
	    // Here we have a logged in session
	    console.log(req.session.userId); // Will print 10;
	  }
	});

	req.session.login('admin', {userId: 10}, function (err) {
	  if(!err) {
	    // Here we have a logged in session
	    console.log(req.session.userId); // Will print 10;
	  }
	});


## logout(cb)

Function for logging out the user.
Is just a proxy for session regeneration.

	req.session.logout(function (err) {
	  if(!err) {
	    // Here we have a logged out session
	  }
	});

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

	var role = req.session.getRole();

## hasRole(role)

Function for validating if the user has the specified role.

	if(req.session.hasRole('admin')) {
		// User is admin
	}

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

## checkRole(role, [errorCallback])

Returns a middleware array to check if the user is logged in and in a given role.

	app.get('/restricted', easySession.checkRole('admin'), function (req, res, next) {
    // If the user reaches this then they are logged in and have the 'admin' role
    // Otherwise they get 401
	});


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