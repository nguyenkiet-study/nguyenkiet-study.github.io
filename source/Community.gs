/**
 * Community.gs
 * Community board, private messages, tags and the 3-day topic.
 *
 * Privacy: other members only ever see a member's full name and an internal ID, never the username
 * (the username is the sign-in name). Messages are only readable by their two members.
 * Admin: a Users row with Role "admin" (Kelvin > Set admin) can hide or delete any post or comment
 * and can change the next topic.
 *
 * Sheets: Posts, Comments, Messages, Notifications (see SCHEMA). Likes, poll votes and message reactions
 * are kept as JSON inside their own row, so no other sheet is needed.
 *
 * Post kinds: free (a question or a note), correct (ask friends to correct a sentence), poll, words (a word list),
 * writing (a shared Writing, Words or Grammar answer), wotd (a sentence with the word of the day),
 * topic (the 3-day topic, written by Kelvin), pinned (a seasonal question, written by Kelvin).
 */
var Social = (function () {
  var P = CONFIG.SHEETS.POSTS, C = CONFIG.SHEETS.COMMENTS, M = CONFIG.SHEETS.MESSAGES, N = CONFIG.SHEETS.NOTIFICATIONS;
  var CM = CONFIG.COMMUNITY;
  var KELVIN = 'kelvin';
  var USER_KINDS = { free: 1, correct: 1, poll: 1, words: 1, writing: 1, wotd: 1 };
  var EMOJI = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
  /** A sticker is sent as the text "[[sticker:id]]"; the pictures live on the website (stickers/ folder). */
  var STICKER = /^\[\[sticker:[a-z0-9-]{2,40}\]\]$/;
  function isSticker(t) { return STICKER.test(String(t || '')); }
  function plain(t) { return isSticker(t) ? 'Sticker' : String(t || ''); }
  /** One emoji (any emoji, including skin tones and joined emoji), no letters. */
  function okEmoji(e) {
    e = String(e || ''); if (!e || e.length > 16 || /[A-Za-z0-9<>]/.test(e)) return false;
    try { return /\p{Extended_Pictographic}/u.test(e); } catch (x) { return EMOJI.indexOf(e) > -1; }
  }
  var HOUR = 3600000, DAY_MS = 24 * HOUR;

  /* ---------- small helpers ---------- */
  function clean(s, max) {
    var t = String(s === undefined || s === null ? '' : s).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/\n{4,}/g, '\n\n\n').trim();
    return t.length > max ? t.slice(0, max) : t;
  }
  function json(v, fallback) { try { var o = JSON.parse(String(v || '')); return o === null || o === undefined ? fallback : o; } catch (e) { return fallback; } }
  function isAdmin(user) { return String(user.Role) === 'admin'; }
  function threadOf(a, b) { return [String(a), String(b)].sort().join('~'); }
  function nowMs() { return Date.now(); }
  function iso(ms) { return new Date(ms).toISOString(); }
  function ms(v) { var t = new Date(String(v)).getTime(); return isNaN(t) ? 0 : t; }

  /** Active members by ID: name only. */
  function people() {
    var out = {};
    Db.all(CONFIG.SHEETS.USERS).forEach(function (u) { if (u.Status === 'active') out[u.UserID] = { id: u.UserID, name: String(u.FullName || 'Member'), admin: String(u.Role) === 'admin' }; });
    out[KELVIN] = { id: KELVIN, name: 'Kelvin', admin: false, bot: true };
    return out;
  }
  function nameOf(ppl, id) { return ppl[id] ? ppl[id].name : 'Former member'; }

  /** Every other active member, for the tag picker and "new message". */
  function members(user) {
    var ppl = people();
    return { members: Object.keys(ppl).filter(function (id) { return id !== user.UserID && !ppl[id].bot; }).map(function (id) { return { id: id, name: ppl[id].name }; })
      .sort(function (a, b) { return a.name.localeCompare(b.name); }) };
  }

  /* ---------- seasons ---------- */
  function inXmas(day) { var md = String(day || Day.today()).slice(5); return md >= '12-01' || md <= '01-06'; }
  function xmasYear(day) { var d = String(day || Day.today()); return d.slice(5) <= '01-06' ? Number(d.slice(0, 4)) - 1 : Number(d.slice(0, 4)); }

  /* =====================================================================
     Messages
     ===================================================================== */
  function badge(user) {
    var uid = user.UserID;
    var msgs = Db.filter(M, function (r) { return r.ToID === uid && !r.ReadAt; }).length;
    var notes = Db.filter(N, function (r) { return r.UserID === uid && !r.ReadAt; }).length;
    return { messages: msgs, notifications: notes };
  }

  function reactionsOut(raw, uid) {
    var r = json(raw, {}), counts = {}, mine = '';
    Object.keys(r).forEach(function (k) { var e = r[k]; if (!okEmoji(e)) return; counts[e] = (counts[e] || 0) + 1; if (k === uid) mine = e; });
    return { counts: counts, mine: mine };
  }

  function threads(user) {
    var uid = user.UserID, ppl = people(), map = {};
    Db.filter(M, function (r) { return r.FromID === uid || r.ToID === uid; }).forEach(function (r) {
      var other = r.FromID === uid ? r.ToID : r.FromID;
      var t = map[other] || (map[other] = { with: { id: other, name: nameOf(ppl, other) }, unread: 0, last: null });
      if (r.ToID === uid && !r.ReadAt) t.unread++;
      if (!t.last || ms(r.CreatedAt) >= ms(t.last.at)) t.last = { text: r.Kind === 'tag' ? 'Tagged ' + (r.FromID === uid ? 'them' : 'you') + ' in an answer' : plain(r.Text).slice(0, 120), mine: r.FromID === uid, at: r.CreatedAt };
    });
    var list = Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return ms(b.last.at) - ms(a.last.at); });
    return { threads: list, unread: list.reduce(function (n, t) { return n + t.unread; }, 0) };
  }

  function thread(user, p) {
    var uid = user.UserID, other = String(p.with || ''), ppl = people();
    if (!ppl[other] || other === uid || other === KELVIN) throw new AppError('This member was not found.');
    var tid = threadOf(uid, other);
    var rows = Db.filter(M, function (r) { return r.ThreadID === tid; }).sort(function (a, b) { return ms(a.CreatedAt) - ms(b.CreatedAt); });
    var unread = rows.filter(function (r) { return r.ToID === uid && !r.ReadAt; });
    if (unread.length) Db.lock(function () { var at = Db.now(); unread.forEach(function (r) { Db.update(M, r._row, { ReadAt: at }); }); });
    rows = rows.slice(-CM.THREAD_SHOW);
    return {
      with: { id: other, name: nameOf(ppl, other) },
      messages: rows.map(function (r) {
        var re = reactionsOut(r.ReactionsJSON, uid);
        return { id: r.MessageID, mine: r.FromID === uid, kind: r.Kind || 'text', text: String(r.Text), ctx: json(r.ContextJSON, null), reactions: re.counts, my: re.mine, at: r.CreatedAt, seen: r.FromID === uid && !!r.ReadAt };
      })
    };
  }

  function send(user, p) {
    var uid = user.UserID, to = String(p.to || ''), ppl = people();
    if (!ppl[to] || to === uid || to === KELVIN) throw new AppError('This member was not found.');
    var text = clean(p.text, CM.MESSAGE_MAX);
    if (!text) throw new AppError('Type a message first.');
    var ctx = p.re ? { re: clean(p.re, 300) } : null;
    // a reply to one message of this chat, with the part that is quoted (the whole message, or the words selected)
    if (p.reply && p.reply.id) {
      var tid0 = threadOf(uid, to), orig = Db.findByKey(M, 'MessageID', String(p.reply.id));
      if (orig && orig.ThreadID === tid0) {
        var q = clean(p.reply.quote, 160) || (isSticker(orig.Text) ? '[Sticker]' : clean(plain(orig.Text), 160));
        ctx = ctx || {}; ctx.reply = { id: orig.MessageID, name: nameOf(ppl, orig.FromID), text: q };
      }
    }
    var row = { MessageID: Db.newId('m'), ThreadID: threadOf(uid, to), FromID: uid, ToID: to, Kind: 'text', Text: text, ContextJSON: ctx ? JSON.stringify(ctx) : '', ReactionsJSON: '', ReadAt: '', CreatedAt: Db.now() };
    Db.lock(function () { Db.insert(M, row); });
    return thread(user, { with: to });
  }

  function react(user, p) {
    var uid = user.UserID, id = String(p.id || ''), e = String(p.emoji || ''), out = null;
    if (e && !okEmoji(e)) throw new AppError('Pick an emoji.');
    Db.lock(function () {
      var r = Db.findByKey(M, 'MessageID', id);
      if (!r || (r.FromID !== uid && r.ToID !== uid)) throw new AppError('This message was not found.');
      var map = json(r.ReactionsJSON, {});
      if (!e || map[uid] === e) delete map[uid]; else map[uid] = e;
      Db.update(M, r._row, { ReactionsJSON: Object.keys(map).length ? JSON.stringify(map) : '' });
      out = reactionsOut(JSON.stringify(map), uid);
    });
    return { id: id, reactions: out.counts, my: out.mine };
  }

  /** A learner tagged friends in an answer: each friend gets the question and the answer as a message. */
  function tag(user, p) {
    var uid = user.UserID, ppl = people();
    var ids = (Array.isArray(p.to) ? p.to : []).map(String).filter(function (id, i, a) { return ppl[id] && id !== uid && id !== KELVIN && a.indexOf(id) === i; }).slice(0, CM.TAG_MAX);
    if (!ids.length) throw new AppError('Pick at least one member to tag.');
    var answer = clean(p.answer, CM.POST_MAX);
    if (!answer) throw new AppError('There is no answer to send.');
    var ctx = { skill: clean(p.skill, 20), title: clean(p.title, 120), question: clean(p.question, 600) };
    var now = Db.now();
    var rows = ids.map(function (to) { return { MessageID: Db.newId('m'), ThreadID: threadOf(uid, to), FromID: uid, ToID: to, Kind: 'tag', Text: answer, ContextJSON: JSON.stringify(ctx), ReactionsJSON: '', ReadAt: '', CreatedAt: now }; });
    Db.lock(function () { Db.insertMany(M, rows); });
    return { sent: ids.length, names: ids.map(function (id) { return ppl[id].name; }) };
  }

  /* =====================================================================
     Community board
     ===================================================================== */
  function visible(r, user) {
    if (r.Status === 'deleted' || r.Status === 'scheduled' || r.Status === 'ended') return false;
    if (r.Status === 'hidden') return isAdmin(user) || r.UserID === user.UserID;
    return true;
  }

  function postOut(r, user, ppl, comments) {
    var uid = user.UserID, likes = json(r.LikesJSON, []), extra = json(r.ExtraJSON, {}), out = {
      id: r.PostID, kind: r.Kind, text: String(r.Text), at: r.CreatedAt, hidden: r.Status === 'hidden',
      author: { id: r.UserID, name: nameOf(ppl, r.UserID), bot: r.UserID === KELVIN }, mine: r.UserID === uid,
      likes: likes.length, liked: likes.indexOf(uid) > -1, comments: comments.length,
      canRemove: r.UserID === uid || isAdmin(user), canHide: isAdmin(user) && r.UserID !== KELVIN
    };
    if (r.Kind === 'poll') {
      var votes = json(r.VotesJSON, {}), tally = (extra.options || []).map(function () { return 0; });
      Object.keys(votes).forEach(function (k) { var i = Number(votes[k]); if (tally[i] !== undefined) tally[i]++; });
      out.poll = { options: extra.options || [], tally: tally, my: votes[uid] === undefined ? -1 : Number(votes[uid]), answer: extra.answer === undefined ? -1 : Number(extra.answer), total: Object.keys(votes).length };
    }
    if (r.Kind === 'words') out.words = extra.words || [];
    if (r.Kind === 'writing') out.share = { skill: extra.skill || '', title: extra.title || '', question: extra.question || '' };
    if (r.Kind === 'wotd') out.word = extra.word || '';
    if (r.Kind === 'topic') out.topic = { endsAt: extra.endsAt, startsAt: extra.startsAt };
    return out;
  }

  function commentOut(c, user, ppl) {
    var likes = json(c.LikesJSON, []);
    return { id: c.CommentID, text: String(c.Text), at: c.CreatedAt, reply: json(c.ReplyJSON, null), author: { id: c.UserID, name: nameOf(ppl, c.UserID) }, mine: c.UserID === user.UserID,
      likes: likes.length, liked: likes.indexOf(user.UserID) > -1, hidden: c.Status === 'hidden', canRemove: c.UserID === user.UserID || isAdmin(user), canHide: isAdmin(user) };
  }

  function commentsByPost() {
    var map = {};
    Db.all(C).forEach(function (c) { (map[c.PostID] = map[c.PostID] || []).push(c); });
    return map;
  }

  function feed(user, p) {
    try { tick(true); } catch (e) { console.log('topic tick skipped: ' + (e && e.message)); }
    var ppl = people(), cmap = commentsByPost(), filter = String(p.filter || 'all');
    var all = Db.all(P);
    var vis = function (c) { return visible(c, user); };
    var list = all.filter(function (r) { return USER_KINDS[r.Kind] && visible(r, user); });
    if (filter === 'correct' || filter === 'poll') list = list.filter(function (r) { return r.Kind === filter; });
    if (filter === 'mine') list = list.filter(function (r) { return r.UserID === user.UserID; });
    list.sort(function (a, b) { return ms(b.CreatedAt) - ms(a.CreatedAt) || b._row - a._row; });
    var before = p.before ? ms(p.before) : 0;
    if (before) list = list.filter(function (r) { return ms(r.CreatedAt) < before; });
    var page = list.slice(0, CM.FEED_PAGE);
    var topic = all.filter(function (r) { return r.Kind === 'topic' && r.Status === 'live'; }).sort(function (a, b) { return ms(b.CreatedAt) - ms(a.CreatedAt); })[0];
    var pinned = inXmas() ? all.filter(function (r) { return r.Kind === 'pinned' && r.Status === 'live'; })[0] : null;
    return {
      topic: topic ? Object.assign(postOut(topic, user, ppl, (cmap[topic.PostID] || []).filter(vis)), { people: uniq((cmap[topic.PostID] || []).filter(vis).map(function (c) { return c.UserID; })).length }) : null,
      pinned: pinned ? postOut(pinned, user, ppl, (cmap[pinned.PostID] || []).filter(vis)) : null,
      wotd: wordOfDay(all),
      posts: page.map(function (r) {
        var cs = (cmap[r.PostID] || []).filter(vis).sort(function (a, b) { return ms(a.CreatedAt) - ms(b.CreatedAt); });
        var o = postOut(r, user, ppl, cs);
        o.preview = cs.slice(-2).map(function (c) { return commentOut(c, user, ppl); });
        return o;
      }),
      more: list.length > page.length,
      admin: isAdmin(user)
    };
  }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }

  function post(user, p) {
    var ppl = people(), r = Db.findByKey(P, 'PostID', String(p.id || ''));
    if (!r || !visible(r, user)) throw new AppError('This post was removed.');
    var cs = Db.filter(C, function (c) { return c.PostID === r.PostID && visible(c, user); }).sort(function (a, b) { return ms(a.CreatedAt) - ms(b.CreatedAt); });
    return { post: postOut(r, user, ppl, cs), comments: cs.map(function (c) { return commentOut(c, user, ppl); }) };
  }

  function create(user, p) {
    var kind = String(p.kind || 'free');
    if (!USER_KINDS[kind]) throw new AppError('Choose what kind of post this is.');
    var text = clean(p.text, CM.POST_MAX), x = p.extra && typeof p.extra === 'object' ? p.extra : {}, extra = {};
    if (kind === 'poll') {
      var opts = (Array.isArray(x.options) ? x.options : []).map(function (o) { return clean(o, 120); }).filter(String).slice(0, 4);
      if (opts.length < 2) throw new AppError('A poll needs at least two answers.');
      if (!text) throw new AppError('Write the poll question.');
      extra.options = opts;
    } else if (kind === 'words') {
      var ws = (Array.isArray(x.words) ? x.words : []).map(function (w) {
        var word = clean(w && w.w, 60), mean = clean(w && w.m, 160);
        return word ? { w: word, m: mean } : null;
      }).filter(Boolean).slice(0, 30);
      if (!ws.length) throw new AppError('Add at least one word.');
      extra.words = ws;
    } else if (kind === 'writing') {
      extra.skill = clean(x.skill, 20); extra.title = clean(x.title, 120); extra.question = clean(x.question, 600);
      if (!text) throw new AppError('There is no answer to share.');
    } else if (kind === 'wotd') {
      extra.word = clean(x.word, 60);
      if (!text) throw new AppError('Write your sentence first.');
    } else if (!text) throw new AppError(kind === 'correct' ? 'Write the sentence you want checked.' : 'Write something first.');
    var row = { PostID: Db.newId('p'), UserID: user.UserID, Kind: kind, Text: text, ExtraJSON: JSON.stringify(extra), LikesJSON: '', VotesJSON: '', Status: 'live', CreatedAt: Db.now(), UpdatedAt: Db.now() };
    Db.lock(function () {
      var mine = Db.filter(P, function (r) { return r.UserID === user.UserID && ms(r.CreatedAt) > nowMs() - DAY_MS; }).length;
      if (mine >= CM.POSTS_PER_DAY) throw new AppError('That is a lot of posts today. Try again tomorrow.', 'limit');
      Db.insert(P, row);
    });
    return { id: row.PostID };
  }

  function notify(to, from, kind, postId, text) {
    if (!to || to === from || to === KELVIN) return;
    // A heart taken back and given again does not notify twice.
    if ((kind === 'like' || kind === 'clike') && Db.find(N, function (r) { return r.UserID === to && r.FromID === from && r.Kind === kind && r.PostID === postId && (kind === 'like' || r.Text === clean(text, 140)); })) return;
    Db.insert(N, { NotificationID: Db.newId('n'), UserID: to, Kind: kind, PostID: postId, FromID: from, Text: clean(text, 140), ReadAt: '', CreatedAt: Db.now() });
  }

  function comment(user, p) {
    var text = clean(p.text, CM.COMMENT_MAX), pid = String(p.postId || '');
    if (!text) throw new AppError('Write a comment first.');
    var r = Db.findByKey(P, 'PostID', pid);
    if (!r || !visible(r, user) || r.Status === 'hidden') throw new AppError('This post was removed.');
    // a reply to a comment on this post (or to the post itself), with the part that is quoted
    var reply = null, replyTo = '';
    if (p.reply && p.reply.id) {
      var ppl = people(), rid = String(p.reply.id);
      if (rid === pid) { reply = { id: pid, name: nameOf(ppl, r.UserID), text: clean(p.reply.quote, 160) || clean(plain(r.Text), 160) }; }
      else {
        var rc = Db.findByKey(C, 'CommentID', rid);
        if (rc && rc.PostID === pid && rc.Status !== 'hidden') { reply = { id: rid, name: nameOf(ppl, rc.UserID), text: clean(p.reply.quote, 160) || (isSticker(rc.Text) ? '[Sticker]' : clean(plain(rc.Text), 160)) }; replyTo = rc.UserID; }
      }
    }
    Db.lock(function () {
      Db.insert(C, { CommentID: Db.newId('c'), PostID: pid, UserID: user.UserID, Text: text, LikesJSON: '', Status: 'live', CreatedAt: Db.now(), ReplyJSON: reply ? JSON.stringify(reply) : '' });
      notify(r.UserID, user.UserID, 'comment', pid, plain(text));
      if (replyTo && replyTo !== r.UserID) notify(replyTo, user.UserID, 'reply', pid, plain(text));
    });
    return post(user, { id: pid });
  }

  function toggle(list, uid) { var i = list.indexOf(uid); if (i > -1) list.splice(i, 1); else list.push(uid); return i < 0; }

  function like(user, p) {
    var out;
    Db.lock(function () {
      var r = Db.findByKey(P, 'PostID', String(p.id || ''));
      if (!r || !visible(r, user)) throw new AppError('This post was removed.');
      var likes = json(r.LikesJSON, []), on = toggle(likes, user.UserID);
      Db.update(P, r._row, { LikesJSON: JSON.stringify(likes) });
      if (on) notify(r.UserID, user.UserID, 'like', r.PostID, String(r.Text).slice(0, 80));
      out = { id: r.PostID, likes: likes.length, liked: on };
    });
    return out;
  }

  function likeComment(user, p) {
    var out;
    Db.lock(function () {
      var c = Db.findByKey(C, 'CommentID', String(p.id || ''));
      if (!c || !visible(c, user)) throw new AppError('This comment was removed.');
      var likes = json(c.LikesJSON, []), on = toggle(likes, user.UserID);
      Db.update(C, c._row, { LikesJSON: JSON.stringify(likes) });
      if (on) notify(c.UserID, user.UserID, 'clike', c.PostID, String(c.Text).slice(0, 80));
      out = { id: c.CommentID, likes: likes.length, liked: on };
    });
    return out;
  }

  function vote(user, p) {
    var out;
    Db.lock(function () {
      var r = Db.findByKey(P, 'PostID', String(p.id || ''));
      if (!r || r.Kind !== 'poll' || !visible(r, user)) throw new AppError('This poll was removed.');
      var extra = json(r.ExtraJSON, {}), i = Number(p.option);
      if (!(i >= 0 && i < (extra.options || []).length)) throw new AppError('Pick one of the answers.');
      var votes = json(r.VotesJSON, {}); votes[user.UserID] = i;
      Db.update(P, r._row, { VotesJSON: JSON.stringify(votes) });
    });
    out = post(user, { id: p.id }).post;
    return out;
  }

  function reveal(user, p) {
    Db.lock(function () {
      var r = Db.findByKey(P, 'PostID', String(p.id || ''));
      if (!r || r.Kind !== 'poll') throw new AppError('This poll was removed.');
      if (r.UserID !== user.UserID && !isAdmin(user)) throw new AppError('Only the person who asked can show the answer.');
      var extra = json(r.ExtraJSON, {}), i = Number(p.answer);
      if (!(i >= 0 && i < (extra.options || []).length)) throw new AppError('Pick the right answer.');
      extra.answer = i;
      Db.update(P, r._row, { ExtraJSON: JSON.stringify(extra), UpdatedAt: Db.now() });
    });
    return post(user, { id: p.id }).post;
  }

  /** Delete (author or admin) or hide/show (admin). Rows are kept with a status, never removed. */
  function moderate(user, p, action) {
    var isPost = p.type !== 'comment', sheet = isPost ? P : C, key = isPost ? 'PostID' : 'CommentID', out = {};
    Db.lock(function () {
      var r = Db.findByKey(sheet, key, String(p.id || ''));
      if (!r || r.Status === 'deleted') throw new AppError('This was already removed.');
      if (action === 'delete') {
        if (r.UserID !== user.UserID && !isAdmin(user)) throw new AppError('Only the author or the admin can delete this.');
        if (r.UserID === KELVIN && isPost) throw new AppError('Change the topic from the topic card instead.');
        Db.update(sheet, r._row, { Status: 'deleted' });
        out.status = 'deleted';
      } else {
        if (!isAdmin(user)) throw new AppError('Only the admin can hide posts.');
        var next = r.Status === 'hidden' ? 'live' : 'hidden';
        Db.update(sheet, r._row, { Status: next });
        out.status = next;
      }
    });
    return out;
  }

  function notifications(user) {
    var uid = user.UserID, ppl = people();
    var rows = Db.filter(N, function (r) { return r.UserID === uid; }).sort(function (a, b) { return ms(b.CreatedAt) - ms(a.CreatedAt); });
    var unread = rows.filter(function (r) { return !r.ReadAt; });
    if (unread.length) Db.lock(function () { var at = Db.now(); unread.forEach(function (r) { Db.update(N, r._row, { ReadAt: at }); }); });
    return { items: rows.slice(0, 40).map(function (r) { return { kind: r.Kind, postId: r.PostID, from: nameOf(ppl, r.FromID), text: String(r.Text), at: r.CreatedAt, unread: !r.ReadAt }; }) };
  }

  /* =====================================================================
     Word of the day: the same word for everyone, picked from the word bank by date
     ===================================================================== */
  function wordOfDay(allPosts) {
    var day = Day.today(), cache = null;
    try { cache = CacheService.getScriptCache(); var hit = cache.get('wotd_' + day); if (hit) return withCount(JSON.parse(hit), allPosts, day); } catch (e) { cache = null; }
    var pool = Db.filter(CONFIG.SHEETS.WORD_BANK, function (r) { return r.Status === 'approved' && r.DefinitionEN && r.Example && CM.WOTD_LEVELS.indexOf(String(r.CEFR)) > -1; });
    if (!pool.length) return null;
    var h = 0; for (var i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) >>> 0;
    var w = pool[h % pool.length];
    var o = { word: String(w.Headword), pos: String(w.PartOfSpeech || ''), level: String(w.CEFR), def: String(w.DefinitionEN), example: String(w.Example).replace(/[\[\]]/g, ''), vi: String(w.VietnameseGloss || ''), day: day };
    try { if (cache) cache.put('wotd_' + day, JSON.stringify(o), 21600); } catch (e) {}
    return withCount(o, allPosts, day);
  }
  function withCount(o, allPosts, day) {
    o.sentences = allPosts.filter(function (r) { return r.Kind === 'wotd' && r.Status === 'live' && Day.ofIso(r.CreatedAt) === day; }).length;
    return o;
  }

  /* =====================================================================
     The 3-day topic
     - A topic is live for 3 days. 12 hours before it ends, Gemini reads the public answers to that topic
       (comments on the topic post, never private messages), reviews how it went and proposes the next topic.
     - The proposal waits as "scheduled" and goes live when the current topic ends, unless the admin changes it.
     - If the AI is busy, the next topic comes from the written list below.
     ===================================================================== */
  var TOPICS = [
    'What is one small habit that made your week better? Tell us how you started it.',
    'Describe your dream weekend in three or four sentences.',
    'What is the best piece of advice you got at work or at school?',
    'Which English word do you always forget? Use it in a sentence so we all remember it.',
    'Tell us about a meal you would cook for a friend. What is in it?',
    'If you could work from anywhere for one month, where would you go and why?',
    'What is one thing you learned this month that surprised you?',
    'Recommend a film, series, book or podcast in English. Why should we try it?',
    'Describe your morning routine. What would you like to change about it?',
    'What is a skill you would like to learn this year, and who could teach you?',
    'Tell us about a place in your city that visitors should not miss.',
    'What is the most useful app on your phone, and how do you use it?',
    'Write a short message inviting the group to lunch. Where should we go?',
    'What makes a good colleague? Give one real example.',
    'Tell us about a mistake that taught you something.',
    'What do you do when you feel tired or stressed after work?',
    'Plan a one-day trip for the group. Where, how and what will we do?',
    'What was your favourite subject at school, and do you still use it?',
    'Describe a person who helped you learn English.',
    'What is one goal you have for next month? How will you reach it?'
  ];
  var XMAS_TOPICS = [
    'Christmas plans: what will you do this Christmas, and who would you invite to your table?',
    'Secret Santa: describe a gift under 200,000 VND that would make a friend smile.',
    'Year in review: what are you proud of this year, and what will you try next year?',
    'New Year: write one wish for each person in this group.'
  ];

  function topicRows() { return Db.filter(P, function (r) { return r.Kind === 'topic'; }).sort(function (a, b) { return ms(a.CreatedAt) - ms(b.CreatedAt); }); }

  function fallbackTopic(used) {
    var list = (inXmas() ? XMAS_TOPICS.concat(TOPICS) : TOPICS).filter(function (t) { return used.indexOf(t) < 0; });
    if (!list.length) list = inXmas() ? XMAS_TOPICS : TOPICS;
    return list[0];
  }

  function insertTopic(text, status, startMs, extra) {
    var row = { PostID: Db.newId('p'), UserID: KELVIN, Kind: 'topic', Text: text, LikesJSON: '', VotesJSON: '', Status: status, CreatedAt: iso(startMs), UpdatedAt: Db.now(),
      ExtraJSON: JSON.stringify(Object.assign({ startsAt: iso(startMs), endsAt: iso(startMs + CM.TOPIC_DAYS * DAY_MS) }, extra || {})) };
    Db.insert(P, row);
    return row;
  }

  /** Asks Gemini to review the topic that is ending and to propose the next one. Never throws. */
  function planNext(live, used) {
    var cs = Db.filter(C, function (c) { return c.PostID === live.PostID && c.Status === 'live'; });
    var ppl = people(), likes = json(live.LikesJSON, []).length;
    var answers = cs.filter(function (c) { return !isSticker(c.Text); }).slice(-CM.TOPIC_REVIEW_MAX).map(function (c) { return '- ' + String(c.Text).replace(/\s+/g, ' ').slice(0, 300); });
    var levels = {}; Db.all(CONFIG.SHEETS.SKILL_LEVELS).forEach(function (r) { if (r.Skill === 'writing') { var l = r.MeasuredLevel || r.SelfLevel; if (l) levels[l] = (levels[l] || 0) + 1; } });
    var stats = { people: uniq(cs.map(function (c) { return c.UserID; })).length, comments: cs.length, hearts: likes, members: Object.keys(ppl).length - 1 };
    try {
      var gen = AI.generateJson('REPORT_AND_PLAN', {
        system: 'You run the weekly conversation topics of a small, friendly English-learning group of adult friends. You output JSON only.',
        temperature: 0.9,
        schema: { type: 'OBJECT', required: ['review', 'next'], properties: {
          review: { type: 'OBJECT', required: ['score', 'verdict', 'worked', 'change'], properties: { score: { type: 'INTEGER' }, verdict: { type: 'STRING' }, worked: { type: 'STRING' }, change: { type: 'STRING' } } },
          next: { type: 'OBJECT', required: ['topic', 'why'], properties: { topic: { type: 'STRING' }, why: { type: 'STRING' } } } } },
        validate: function (d) { return d && d.review && d.next && String(d.next.topic || '').length > 15 ? '' : 'missing next topic'; },
        prompt: 'Topic that is ending: "' + live.Text + '"\n' +
          'Engagement: ' + stats.people + ' of ' + stats.members + ' members answered, ' + stats.comments + ' comments, ' + stats.hearts + ' hearts on the topic.\n' +
          'Writing levels in the group (CEFR: members): ' + (Object.keys(levels).map(function (k) { return k + ': ' + levels[k]; }).join(', ') || 'unknown') + '.\n' +
          (inXmas() ? 'Season: Christmas and New Year. The next topic should fit the season.\n' : '') +
          'Answers (public comments):\n' + (answers.join('\n') || '(no answers yet)') + '\n\n' +
          'Topics already used (do not repeat or closely copy):\n' + used.slice(-20).map(function (t) { return '- ' + t; }).join('\n') + '\n\n' +
          '1. Review the topic. "score" 1 (no one engaged) to 5 (many people answered and talked to each other). "verdict" one short sentence. "worked" what made people answer. "change" what to do differently.\n' +
          '2. Propose the next topic for 3 days. One or two short sentences in simple English (A2 to B1) that anyone can answer from their own life or work, and that invites people to reply to each other. Learn from the review: keep what worked. Under 180 characters.\n' +
          'Return JSON: {"review":{"score":3,"verdict":"...","worked":"...","change":"..."},"next":{"topic":"...","why":"..."}}'
      });
      var d = gen.data, t = clean(d.next.topic, 240);
      if (used.indexOf(t) > -1) throw new Error('repeat');
      return { text: t, why: clean(d.next.why, 300), source: 'ai', model: gen.model,
        review: { score: Math.max(1, Math.min(5, Number(d.review.score) || 3)), verdict: clean(d.review.verdict, 240), worked: clean(d.review.worked, 300), change: clean(d.review.change, 300), stats: stats } };
    } catch (e) {
      console.log('topic AI skipped: ' + (e && e.message));
      return { text: fallbackTopic(used), why: '', source: 'list', review: { score: 0, verdict: 'The AI review was not available this time.', worked: '', change: '', stats: stats } };
    }
  }

  /** Keeps the topic and the seasonal pinned question up to date. Safe to call often (the feed and an hourly trigger call it). */
  function tick(allowAI) {
    var now = nowMs(), topics = topicRows(), used = topics.map(function (r) { return String(r.Text); });
    var live = topics.filter(function (r) { return r.Status === 'live'; }).pop();
    var next = topics.filter(function (r) { return r.Status === 'scheduled'; }).pop();
    var changed = false;
    seasonPin();
    if (!live && !next) {
      Db.lock(function () { if (!topicRows().some(function (r) { return r.Status === 'live'; })) insertTopic(fallbackTopic(used), 'live', now, { source: 'list' }); });
      return true;
    }
    var endsAt = live ? ms(json(live.ExtraJSON, {}).endsAt) : 0;
    // Plan the next topic 12 hours before this one ends (or now, if it is already over).
    if (live && !next && now >= endsAt - CM.TOPIC_REVIEW_HOURS * HOUR) {
      var guard = null;
      try { guard = CacheService.getScriptCache(); if (guard.get('topic_planning')) return false; guard.put('topic_planning', '1', 120); } catch (e) { guard = null; }
      var plan = allowAI ? planNext(live, used) : { text: fallbackTopic(used), why: '', source: 'list', review: null };
      Db.lock(function () {
        if (topicRows().some(function (r) { return r.Status === 'scheduled'; })) return;
        var ex = json(live.ExtraJSON, {}); if (plan.review) { ex.review = plan.review; Db.update(P, live._row, { ExtraJSON: JSON.stringify(ex) }); }
        var start = Math.max(endsAt, now);
        next = insertTopic(plan.text, 'scheduled', start, { source: plan.source, why: plan.why, publishAt: iso(start), reviewOf: live.PostID });
      });
      try { if (guard) guard.remove('topic_planning'); } catch (e) {}
      changed = true;
      next = topicRows().filter(function (r) { return r.Status === 'scheduled'; }).pop();
    }
    if (next && (!live || now >= endsAt) && now >= ms(json(next.ExtraJSON, {}).publishAt || next.CreatedAt)) {
      Db.lock(function () { activate(next, live, now); });
      changed = true;
    }
    return changed;
  }

  function activate(next, live, now) {
    var fresh = Db.findByKey(P, 'PostID', next.PostID); if (!fresh || fresh.Status !== 'scheduled') return;
    if (live) { var l = Db.findByKey(P, 'PostID', live.PostID); if (l && l.Status === 'live') Db.update(P, l._row, { Status: 'ended', UpdatedAt: Db.now() }); }
    var ex = json(fresh.ExtraJSON, {}); ex.startsAt = iso(now); ex.endsAt = iso(now + CM.TOPIC_DAYS * DAY_MS);
    Db.update(P, fresh._row, { Status: 'live', CreatedAt: iso(now), UpdatedAt: Db.now(), ExtraJSON: JSON.stringify(ex) });
  }

  /** The Christmas question, pinned from 1 December to 6 January. */
  function seasonPin() {
    var pins = Db.filter(P, function (r) { return r.Kind === 'pinned'; });
    if (inXmas()) {
      var season = 'xmas-' + xmasYear();
      if (pins.some(function (r) { return json(r.ExtraJSON, {}).season === season; })) return;
      Db.lock(function () {
        if (Db.filter(P, function (r) { return r.Kind === 'pinned' && json(r.ExtraJSON, {}).season === season; }).length) return;
        Db.insert(P, { PostID: Db.newId('p'), UserID: KELVIN, Kind: 'pinned', Text: CM.XMAS_QUESTION, ExtraJSON: JSON.stringify({ season: season }), LikesJSON: '', VotesJSON: '', Status: 'live', CreatedAt: Db.now(), UpdatedAt: Db.now() });
      });
    } else {
      var old = pins.filter(function (r) { return r.Status === 'live'; });
      if (old.length) Db.lock(function () { old.forEach(function (r) { Db.update(P, r._row, { Status: 'ended' }); }); });
    }
  }

  /** Admin view of the topic: the current one, the review of the last one and the proposal waiting to go live. */
  function topicAdmin(user) {
    if (!isAdmin(user)) throw new AppError('Only the admin can see this.');
    var topics = topicRows(), live = topics.filter(function (r) { return r.Status === 'live'; }).pop(), next = topics.filter(function (r) { return r.Status === 'scheduled'; }).pop();
    var lastReviewed = topics.filter(function (r) { return json(r.ExtraJSON, {}).review; }).pop();
    var x = function (r) { if (!r) return null; var e = json(r.ExtraJSON, {}); return { id: r.PostID, text: String(r.Text), startsAt: e.startsAt, endsAt: e.endsAt, publishAt: e.publishAt, source: e.source || '', why: e.why || '', review: e.review || null }; };
    return { live: x(live), next: x(next), reviewed: x(lastReviewed) };
  }

  function topicEdit(user, p) {
    if (!isAdmin(user)) throw new AppError('Only the admin can change the topic.');
    var text = clean(p.text, 240);
    if (text.length < 10) throw new AppError('Write a topic of at least a few words.');
    Db.lock(function () {
      var topics = topicRows(), live = topics.filter(function (r) { return r.Status === 'live'; }).pop(), next = topics.filter(function (r) { return r.Status === 'scheduled'; }).pop();
      if (next) {
        var e = json(next.ExtraJSON, {}); e.source = 'admin'; e.why = 'Written by the admin.';
        Db.update(P, next._row, { Text: text, ExtraJSON: JSON.stringify(e), UpdatedAt: Db.now() });
      } else {
        var start = live ? Math.max(ms(json(live.ExtraJSON, {}).endsAt), nowMs()) : nowMs();
        insertTopic(text, 'scheduled', start, { source: 'admin', why: 'Written by the admin.', publishAt: iso(start) });
      }
    });
    return topicAdmin(user);
  }

  /** The admin starts the waiting topic now instead of waiting for the current one to end. */
  function topicPublish(user) {
    if (!isAdmin(user)) throw new AppError('Only the admin can change the topic.');
    Db.lock(function () {
      var topics = topicRows(), live = topics.filter(function (r) { return r.Status === 'live'; }).pop(), next = topics.filter(function (r) { return r.Status === 'scheduled'; }).pop();
      if (!next) throw new AppError('There is no next topic yet. Write one first.');
      activate(next, live, nowMs());
    });
    return topicAdmin(user);
  }

  return {
    members: members, badge: badge, threads: threads, thread: thread, send: send, react: react, tag: tag,
    feed: feed, post: post, create: create, comment: comment, like: like, likeComment: likeComment, vote: vote, reveal: reveal,
    remove: function (u, p) { return moderate(u, p, 'delete'); }, hide: function (u, p) { return moderate(u, p, 'hide'); },
    notifications: notifications, tick: tick, topicAdmin: topicAdmin, topicEdit: topicEdit, topicPublish: topicPublish,
    inXmas: inXmas, EMOJI: EMOJI, TOPICS: TOPICS
  };
})();

/** Hourly trigger entry point (must be a global function): moves the 3-day topic along. */
function communityTick() { Social.tick(true); }
