[easy-session](https://github.com/DeadAlready/node-easy-session) is a session extension and middleware for express and
connect with the aim of providing few convenience functions and security features.

# Installation

    $ npm install easy-session

# Usage

To use easy-session simply require the module and run it with express or connect. This will return the middleware to bind
to the stack. It can easily be done with two lines:

	var express = require('express');
	var easySession = require('easy-session'); // Require the module : line 1

	var app = express();

	app.use(express.cookieParser());
	app.use(express.session({secret: 'keyboard cat'});
	app.use(easySession(express)); // Bind the module : line 2


# Options

The middleware supports the following configuration object that can be sent as a second argument to the easySession function

	{
		ipCheck: {boolean} // Defines if IP must be consistent during the session - defaults to true
		uaCheck: {boolean} // Defines if UA must be consistent during the session - defaults to true
		freshTimeout: {time in ms} // Time since last request still under the maxFreshTimeout when the session is considered
															 // fresh - defaults to 5 minutes
		maxFreshTimeout: {time in ms} // Time since login after which the session is stale no matter the activity
	}

The IP and UA (User Agent) checks are a method against session hijacking - if the IP or User Agent changes mid-session then
it is a good chance that the session has been hijacked. In which case it should be invalidated.

# Functions

easy-session adds the following extra functions to the Session object.

## login(cb)

Function for logging the user in.
Regenerates the session and adds _loggedInAt to the session object.
Depending on the configuration also adds _ip and _ua for continuity checks.

	req.session.login(function (err) {
		if(!err) {
			// Here we have a logged in session
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

## isFresh()

Function for checking if the logged in session is fresh or stale.
Returns true if fresh, false if stale.

	if(req.session.isFresh()) {
		// User has logged in recently - session is fresh
	}

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