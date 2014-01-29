'use strict';

module.exports = function (connect, opts) {

    if(!connect) {
        throw new TypeError('expected connect or express object as first argument');
    }
    var Session = connect.session.Session;

    // Get options
    if(typeof opts !== 'object') {
        throw new TypeError('expected an options object as second argument');
    }


    var ipCheck = opts.ipCheck === undefined ? true : !!opts.ipCheck;
    var uaCheck = opts.uaCheck === undefined ? true : !!opts.uaCheck;
    var freshTimeout = opts.freshTimeout || (5 * 60 * 1000);
    var maxFreshTimeout = opts.maxFreshTimeout || (10 * 60 * 1000);

    // Extend the Session object

    /**
     * Function for logging the user in.
     * Regenerates the session and adds _loggedInAt to the session object.
     * Depending on the configuration also adds _ip and _ua for continuity checks.
     * @param cb
     */
    Session.prototype.login = function login(cb) {
        var req = this.req;
        this.regenerate(function (err) {
            if(err) {
                cb(err);
                return;
            }
            // Add logged in date
            req.session._loggedInAt = Date.now();
            req.session._lastRequestAt = Date.now();

            if(ipCheck) {
                req.session._ip = req.ip;
            }
            if(uaCheck) {
                req.session._ua = req.headers['user-agent'];
            }
            cb();
        });
    };
    /**
     * Function for logging out the user.
     * Is just a proxy for session regeneration.
     * @param cb
     * @returns {*}
     */
    Session.prototype.logout = function logout(cb) {
        return this.regenerate(cb);
    };

    var oldResetMaxAge = Session.prototype.resetMaxAge;

    Session.prototype.resetMaxAge = function resetMaxAge() {
        this._lastRequestAt = Date.now();
        return oldResetMaxAge.call(this);
    };

    /**
     * Function for checking if the user is a guest.
     * Returns true if logged out, false if logged in.
     * @returns {boolean}
     */
    Session.prototype.isGuest = function isGuest() {
        return !this._loggedInAt; // If this is not set then we are not logged in
    };

    /**
     * Function for checking if the logged in session is fresh or stale.
     * Returns true if fresh, false if stale.
     * @returns {boolean}
     */
    Session.prototype.isFresh = function isFresh() {
        if(!this._loggedInAt) {
            return false;
        }
        var age = Date.now() - this._loggedInAt;
        if(age > (maxFreshTimeout)) {
            return false;
        }
        if(age < freshTimeout || (Date.now() - this._lastRequestAt) < (freshTimeout)) {
            return true;
        }
        return false;
    };

    /**
     * Middleware for removing cookies from browser cache and
     * depending on configuration checking if users IP and UA have changed mid session.
     */
    return function sessionMiddleware(req, res, next) {

        // Remove cookies from cache - a security feature
        res.header('Cache-Control', 'no-cache="Set-Cookie, Set-Cookie2"');

        if(!req.session) { // If there is no session then something is wrong
            next(new Error('Session object missing'));
            return;
        }

        if(req.session.isGuest()) { // If not logged in then continue
            next();
            return;
        }

        if(ipCheck && req.session._ip !== req.ip) { // Check if IP matches
            // It would be wise to log more information here to either notify the user or
            // to try and prevent further attacks
            console.warn('The request IP did not match session IP');

            // Generate a new unauthenticated session
            req.session.logout(next);
            return;
        }

        if(uaCheck && req.session._ua !== req.headers['user-agent']) { // Check if UA matches
            // It would be wise to log more information here to either notify the user or
            // to try and prevent further attacks
            console.warn('The request User Agent did not match session user agent');

            // Generate a new unauthenticated session
            req.session.logout(next);
            return;
        }
        // Everything checks out so continue
        next();
    };

};