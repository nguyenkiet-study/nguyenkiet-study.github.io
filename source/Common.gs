/**
 * Common.gs
 * Small helpers shared by Words, Practice, Plan and Progress.
 *
 * Day: calendar days as 'yyyy-MM-dd' text in the script's time zone (File > Project settings > Time zone).
 * Set that to your own time zone (for example Asia/Ho_Chi_Minh) so that "today" and the streak change at your midnight.
 */
var Day = (function () {
  function zone() { try { return Session.getScriptTimeZone() || 'UTC'; } catch (e) { return 'UTC'; } }

  /** Today's date in the script time zone. */
  function today() { return Utilities.formatDate(new Date(), zone(), 'yyyy-MM-dd'); }

  /** The date (in the script time zone) of an ISO timestamp such as the ones stored in CreatedAt. */
  function ofIso(iso) {
    var d = new Date(String(iso));
    if (isNaN(d.getTime())) return '';
    return Utilities.formatDate(d, zone(), 'yyyy-MM-dd');
  }

  /** A stored date value as 'yyyy-MM-dd' (Sheets can turn a date into a timestamp if a column is not plain text). */
  function norm(v) {
    var t = String(v === undefined || v === null ? '' : v);
    return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : (t ? ofIso(t) : '');
  }

  function parts(s) { var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? [Number(m[1]), Number(m[2]) - 1, Number(m[3])] : null; }
  function utc(s) { var p = parts(s); if (!p) throw new Error('Bad date: ' + s); return Date.UTC(p[0], p[1], p[2]); }

  /** Adds n days (n may be negative) to a date text. Pure calendar arithmetic, no time zone involved. */
  function add(s, n) { return new Date(utc(s) + n * 86400000).toISOString().slice(0, 10); }

  /** Whole days from a to b (b - a). */
  function diff(a, b) { return Math.round((utc(b) - utc(a)) / 86400000); }

  /** The Monday of the week that contains the date. */
  function weekStart(s) { var dow = new Date(utc(s)).getUTCDay(); return add(s, -((dow + 6) % 7)); }

  /** 0 for Monday to 6 for Sunday. */
  function weekday(s) { return (new Date(utc(s)).getUTCDay() + 6) % 7; }

  return { today: today, ofIso: ofIso, norm: norm, add: add, diff: diff, weekStart: weekStart, weekday: weekday };
})();

var Util = (function () {
  function jparse(s, fallback) { try { return s ? JSON.parse(s) : fallback; } catch (e) { return fallback; } }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function wordCount(t) { var m = String(t || '').trim().match(/\S+/g); return m ? m.length : 0; }
  function isTrue(v) { return v === true || String(v).toLowerCase() === 'true'; }
  /** A small, repeatable number from text (0 to 1). Used to put things in a stable "random" order per user and day. */
  function hash01(text) {
    var h = 2166136261;
    for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 0) % 1000003) / 1000003;
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  return { jparse: jparse, clamp: clamp, wordCount: wordCount, isTrue: isTrue, hash01: hash01, shuffle: shuffle };
})();
