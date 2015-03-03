'use strict';

module.exports.main = function easySessionMain(connect, opts) {

    if(!connect) {
        throw new TypeError('expected connect or express or express-session object as first argument');
    }
    var Session = connect.Session || connect.session.Session;

    // Get options
    opts = opts || {};
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
     * @param obj - optional properties to set on created session
     * @param cb
     */
    Session.prototype.login = function login(role, extend, cb) {
        if(typeof role === 'function') {
            cb = role;
            extend = false;
            role = 'authenticated';
        } else if (typeof role === 'object') {
            cb = extend;
            extend = role;
            role = 'authenticated';
        }
        if(typeof extend === 'function') {
            cb = extend;
            extend = false;
        } else if (extend && typeof extend !== 'object') {
            throw new TypeError('Second parameter expected to be an object');
        }

        var req = this.req;
        this.regenerate(function (err) {
            if(err) {
                cb(err);
                return;
            }
            // Add logged in date
            req.session._loggedInAt = Date.now();
            req.session._lastRequestAt = Date.now();
            req.session.setRole(role);

            if(ipCheck) {
                req.session._ip = req.ip;
            }
            if(uaCheck) {
                req.session._ua = req.headers['user-agent'];
            }
            if(extend) {
                Object.keys(extend).forEach(function (key) {
                    req.session[key] = extend[key];
                });
            }
            req.session.save();
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
     * Function for setting the last request for current moment
     * @returns {*}
     */
    Session.prototype.setLastRequest = function setLastRequest() {
        this._lastRequestAt = Date.now();
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
     * Function for checking if the user is logged in.
     * Returns true if logged id, false if logged out.
     *
     * @param [optional] {string} - If present the user is also checked for the role
     * @returns {boolean}
     */
    Session.prototype.isLoggedIn = function isLoggedIn(role) {
        if(!role) {
            return !this.isGuest();
        }
        return !this.isGuest() && this.hasRole(role);
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
     * Function setting a role on the session
     * @returns {boolean}
     */
    Session.prototype.setRole = function setRole(role) {
        this._role = role;
    };

    /**
     * Function getting a role from the session
     * @returns {boolean}
     */
    Session.prototype.getRole = function getRole() {
        return this._role || 'guest';
    };

    /**
     * Function checking the session role
     *
     * returns true if given role matches the session role, false otherwise
     * @returns {boolean}
     */
    Session.prototype.hasRole = function hasRole(role) {
        return this.getRole() === role;
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

        function refresh(){
            res.removeListener('finish', refresh);
            res.removeListener('close', refresh);
            req.session.setLastRequest();
        }

        res.on('finish', refresh);
        res.on('close', refresh);

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

/**
 * An express/connect middleware for checking if the user is loggedIn
 * @param errorCallback
 * @returns {Function}
 */
function isLoggedIn(errorCallback) {
    return function (req, res, next) {
        if(req.session.isLoggedIn()) {
            next();
            return;
        }
        if(errorCallback) {
            errorCallback(req, res, next);
            return;
        }

        if(res.sendStatus) {
            res.sendStatus(401);
        } else {
            res.send(401);
        }
    };
}
module.exports.isLoggedIn = isLoggedIn;

/**
 * An express/connect middleware for checking if the user is loggedIn and session isFresh
 * @param errorCallback
 * @returns {Function}
 */
function isFresh(errorCallback) {
    return function (req, res, next) {
        if(req.session.isFresh()) {
            next();
            return;
        }
        if(errorCallback) {
            errorCallback(req, res, next);
            return;
        }

        if(res.sendStatus) {
            res.sendStatus(401);
        } else {
            res.send(401);
        }
    };
}
module.exports.isFresh = isFresh;

/**
 * An express/connect middleware for checking if the user is logged in and has
 * certain _role value
 *
 * @param role - role to check for
 * @param errorCallback
 * @returns {Function}
 */
module.exports.checkRole = function checkRole(role, errorCallback) {
    return function (req, res, next) { // Check role
        if(req.session.isLoggedIn(role)) {
            next();
            return;
        }
        if(errorCallback) {
            errorCallback(req, res, next);
            return;
        }

        if(res.sendStatus) {
            res.sendStatus(401);
        } else {
            res.send(401);
        }
    };
};