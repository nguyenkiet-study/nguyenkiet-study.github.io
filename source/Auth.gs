/**
 * Auth.gs
 * Accounts, password hashing and sign-in sessions. Users sign in with a username (no email).
 *
 * Storage
 *  - Users: the password is never stored. Only a salted, iterated HMAC-SHA256 hash is.
 *  - AuthSessions: only the SHA-256 hash of the session token is stored, so a leaked sheet cannot be used to sign in.
 *  - The secret "pepper" lives in Script properties (AUTH_PEPPER), created by setupDatabase(). Never change it,
 *    or every existing password stops working.
 *
 * Optional invite code: set the Script property INVITE_CODE (Kelvin menu > Set invite code) so only people
 * who know the code can register. Leave it empty to allow open registration.
 */
var Auth = (function () {
  var CACHE_TTL = 600; // seconds

  function props() { return PropertiesService.getScriptProperties(); }

  function pepper() {
    var p = props().getProperty('AUTH_PEPPER');
    if (!p) throw new Error('AUTH_PEPPER is missing. Run setupDatabase() once.');
    return p;
  }

  function toHex(bytes) {
    return bytes.map(function (b) { return ('0' + ((b < 0 ? b + 256 : b)).toString(16)).slice(-2); }).join('');
  }

  function sha256Hex(text) {
    return toHex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8));
  }

  function newSalt() {
    return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Utilities.getUuid() + Date.now()));
  }

  /** Iterated HMAC-SHA256 (key stretching). Returns base64. */
  function hashPassword(password, salt, iterations) {
    var pw = Utilities.newBlob(password).getBytes();
    var d = Utilities.computeHmacSha256Signature(Utilities.base64Decode(salt).concat(Utilities.newBlob(pepper()).getBytes()), pw);
    for (var i = 1; i < iterations; i++) d = Utilities.computeHmacSha256Signature(d, pw);
    return Utilities.base64Encode(d);
  }

  function safeEqual(a, b) {
    a = String(a); b = String(b);
    if (a.length !== b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  function normalizeUsername(u) { return String(u === undefined || u === null ? '' : u).trim().toLowerCase(); }
  function validUsername(u) { return new RegExp(CONFIG.AUTH.USERNAME_PATTERN).test(u); }
  function validPassword(p) {
    p = String(p || '');
    return p.length >= CONFIG.AUTH.PASSWORD_MIN_LENGTH && p.length <= 200; // no other rules: any password is allowed
  }

  /* ----- throttling (script cache; no sheet writes) ----- */
  function failKey(username) { return 'lf_' + sha256Hex(username).slice(0, 24); }
  function failCount(key) { return parseInt(CacheService.getScriptCache().get(key) || '0', 10); }
  function addFail(key) { CacheService.getScriptCache().put(key, String(failCount(key) + 1), CONFIG.AUTH.LOCK_MINUTES * 60); }
  function lockedMessage() { return 'Too many attempts. Please wait ' + CONFIG.AUTH.LOCK_MINUTES + ' minutes and try again.'; }

  function inviteCode() { return String(props().getProperty('INVITE_CODE') || '').trim(); }
  function inviteRequired() { return inviteCode() !== ''; }

  /* ----- sessions ----- */
  function createSession(userId) {
    var token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
    var created = new Date(), expires = new Date(created.getTime() + CONFIG.AUTH.SESSION_HOURS * 3600 * 1000);
    Db.insert(CONFIG.SHEETS.AUTH_SESSIONS, { TokenHash: sha256Hex(token), UserID: userId, ExpiresAt: expires.toISOString(), CreatedAt: created.toISOString() });
    return token;
  }

  /** Returns the Users row for a valid token, or throws AppError('auth'). */
  function authenticate(token) {
    var fail = new AppError('Your session has expired. Please sign in again.', 'auth');
    if (!token || typeof token !== 'string' || token.length < 32 || token.length > 128) throw fail;
    var s = Db.findByKey(CONFIG.SHEETS.AUTH_SESSIONS, 'TokenHash', sha256Hex(token));
    if (!s) throw fail;
    if (new Date(s.ExpiresAt).getTime() < Date.now()) {
      Db.lock(function () { var again = Db.findByKey(CONFIG.SHEETS.AUTH_SESSIONS, 'TokenHash', s.TokenHash); if (again) Db.removeRows(CONFIG.SHEETS.AUTH_SESSIONS, [again._row]); });
      throw fail;
    }
    var user = Db.findByKey(CONFIG.SHEETS.USERS, 'UserID', s.UserID);
    if (!user || user.Status !== 'active') throw fail;
    return user;
  }

  function publicUser(u) { return { id: u.UserID, name: u.FullName, username: u.Username, role: u.Role }; }

  /* ----- public operations ----- */
  function register(p) {
    var name = String(p.name || '').replace(/\s+/g, ' ').trim();
    var username = normalizeUsername(p.username);
    var password = String(p.password || '');
    if (name.length < 2 || name.length > CONFIG.AUTH.NAME_MAX_LENGTH) throw new AppError('Enter your name (2 to ' + CONFIG.AUTH.NAME_MAX_LENGTH + ' characters).');
    if (!validUsername(username)) throw new AppError('Username must be 3 to 20 characters: letters, numbers, dot, dash or underscore.');
    if (!validPassword(password)) throw new AppError('Enter a password.');

    if (inviteRequired()) {
      var gate = 'ri_global', cache = CacheService.getScriptCache();
      if (parseInt(cache.get(gate) || '0', 10) >= 10) throw new AppError(lockedMessage(), 'locked');
      if (!safeEqual(String(p.invite || '').trim(), inviteCode())) {
        cache.put(gate, String(parseInt(cache.get(gate) || '0', 10) + 1), CONFIG.AUTH.LOCK_MINUTES * 60);
        throw new AppError('The invite code is not correct. Ask the person who invited you.');
      }
    }

    var salt = newSalt(), iterations = CONFIG.AUTH.HASH_ITERATIONS;
    var hash = hashPassword(password, salt, iterations); // slow step, done before taking the lock
    return Db.lock(function () {
      if (Db.findByKey(CONFIG.SHEETS.USERS, 'Username', username)) throw new AppError('This username is already taken. Try signing in instead.');
      var id = Db.newId('usr'), now = Db.now();
      Db.insert(CONFIG.SHEETS.USERS, { UserID: id, FullName: name, Username: username, PasswordHash: hash, Salt: salt, Iterations: iterations, Role: 'user', Status: 'active', CreatedAt: now, LastLoginAt: now });
      Db.insert(CONFIG.SHEETS.USER_PROFILES, { UserID: id, OnboardingDone: false, WeeklyGoalMin: 150, VoiceAccent: 'us', ReminderOn: true, ReduceMotion: false, PlacementDone: false, UpdatedAt: now });
      Db.insert(CONFIG.SHEETS.ACTIVITY_LOGS, { LogID: Db.newId('log'), UserID: id, Event: 'register', Detail: '', CreatedAt: now });
      return { token: createSession(id), userRow: { UserID: id, FullName: name, Username: username, Role: 'user' } };
    });
  }

  function login(p) {
    var username = normalizeUsername(p.username), password = String(p.password || '');
    var generic = new AppError('Incorrect username or password.');
    if (!validUsername(username) || !password || password.length > 200) throw generic;
    var key = failKey(username);
    if (failCount(key) >= CONFIG.AUTH.MAX_FAILED_LOGINS) throw new AppError(lockedMessage(), 'locked');

    var user = Db.findByKey(CONFIG.SHEETS.USERS, 'Username', username);
    // Hash even when the user does not exist, so the response time does not reveal which usernames exist.
    var salt = user ? user.Salt : newSalt(), iterations = user ? Number(user.Iterations) || CONFIG.AUTH.HASH_ITERATIONS : CONFIG.AUTH.HASH_ITERATIONS;
    var hash = hashPassword(password, salt, iterations);
    if (!user || !safeEqual(hash, user.PasswordHash)) { addFail(key); throw generic; }
    if (user.Status !== 'active') throw new AppError('This account is turned off. Ask the person who runs Kelvin.');

    CacheService.getScriptCache().remove(key);
    var now = Db.now();
    Db.lock(function () {
      Db.update(CONFIG.SHEETS.USERS, user._row, { LastLoginAt: now });
      Db.insert(CONFIG.SHEETS.ACTIVITY_LOGS, { LogID: Db.newId('log'), UserID: user.UserID, Event: 'login', Detail: '', CreatedAt: now });
    });
    return { token: createSession(user.UserID), userRow: user };
  }

  function logout(token) {
    if (!token || typeof token !== 'string') return;
    Db.lock(function () {
      var s = Db.findByKey(CONFIG.SHEETS.AUTH_SESSIONS, 'TokenHash', sha256Hex(token));
      if (s) Db.removeRows(CONFIG.SHEETS.AUTH_SESSIONS, [s._row]);
    });
  }

  /** Deletes expired sessions. Run daily by a trigger (setupTriggers). */
  function cleanupSessions() {
    Db.lock(function () {
      var rows = Db.filter(CONFIG.SHEETS.AUTH_SESSIONS, function (r) { return new Date(r.ExpiresAt).getTime() < Date.now(); });
      Db.removeRows(CONFIG.SHEETS.AUTH_SESSIONS, rows.map(function (r) { return r._row; }));
    });
  }

  return {
    register: register, login: login, logout: logout, authenticate: authenticate,
    publicUser: publicUser, inviteRequired: inviteRequired, cleanupSessions: cleanupSessions,
    normalizeUsername: normalizeUsername, validUsername: validUsername, validPassword: validPassword,
    hashPassword: hashPassword, newSalt: newSalt
  };
})();

/** Trigger entry point (must be a global function). */
function cleanupSessions() { Auth.cleanupSessions(); }
