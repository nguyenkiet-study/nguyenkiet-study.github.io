/**
 * Conversation.gs
 * Listening: conversations between two named people, with exercises on that one conversation.
 *
 * A lesson is one QuestionBank row: Skill "listening", Subtype "conversation".
 *   Stem               the title
 *   Passage            JSON {scene, speakers:[{name, role, g:'m'|'f'}], words:[{w, m}], lines:[{s:0|1, t, vi}]}
 *   OptionsJSON        JSON list of exercises WITH their answers (never sent to the browser as they are)
 *   EvaluationCriteria the topic
 * Each lesson has new people (a different pair of names each time). Exercises: the main idea, details, "who said it?",
 * true / false / not given, one word to fill in a line, and putting four events in order.
 * Lessons come from the hand-written ones (two below, 48 more in ConversationSeed.gs) and from the AI: when a learner has no new lesson at their level,
 * starting one asks the AI to write it (one call) and a second model answers the questions on its own; only questions
 * both agree on are kept. Kelvin > Generate questions also tops up CONFIG.TEST.CONVERSATION_TARGET lessons per level.
 */
var Conv = (function () {
  var QB = CONFIG.SHEETS.QUESTION_BANK, TYPE = 'practice:conversation', TF = ['True', 'False', 'Not given'];
  var LINES = { A1: [6, 8], A2: [8, 10], B1: [10, 12], B2: [12, 14], C1: [12, 16], C2: [12, 16] };
  var WORDS_PER_LINE = { A1: 12, A2: 14, B1: 20, B2: 24, C1: 28, C2: 30 };
  var TOPICS = [
    'weekend plans between a teenager and his or her dad', 'ordering coffee and cake at a cafe', 'booking a table at a restaurant by phone',
    'asking for directions in a new city', 'a short job interview', 'a manager and an employee talking about a deadline',
    'making a doctor\'s appointment', 'returning a shirt that does not fit', 'checking in at a hotel', 'two friends planning a trip to Da Lat',
    'a neighbour complaining about noise', 'calling IT support because a laptop will not start', 'colleagues choosing where to have lunch',
    'planning a surprise birthday party', 'joining a gym', 'looking at a flat to rent', 'checking in at the airport', 'a new colleague\'s first day',
    'a customer calling about a late delivery', 'a mother and daughter cooking dinner', 'two classmates preparing a presentation',
    'a taxi driver and a passenger in traffic', 'buying a train ticket', 'a teacher giving feedback on homework', 'planning a team-building day',
    'grandparents and a grandchild talking about the old days', 'a phone call to change a meeting time', 'shopping for a gift for a colleague'
  ];

  function jparse(s, d) { try { var v = JSON.parse(String(s || '')); return v == null ? d : v; } catch (e) { return d; } }
  function clean(s, n) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n || 300); }
  function levelIdx(l) { return Math.max(0, CONFIG.LEVELS.indexOf(String(l))); }
  function okName(n) { return /^[A-Za-z][A-Za-z .'-]{0,19}$/.test(n); }
  function words(t) { return String(t).split(/\s+/).filter(Boolean).length; }

  /* ---------- the two hand-written lessons ---------- */
  var SEED = [
    { level: 'A2', topic: 'weekend plans between a teenager and his dad', title: 'Saturday plans',
      scene: 'Tom is talking to his dad in the kitchen on Friday evening.',
      speakers: [{ name: 'Tom', role: 'a 15-year-old boy', g: 'm' }, { name: 'Dad', role: 'Tom\'s father', g: 'm' }],
      words: [{ w: 'match', m: 'a game of football' }, { w: 'tidy', m: 'to make a room clean and neat' }],
      lines: [
        { s: 0, t: 'Dad, can I go to the football match with Minh tomorrow?', vi: 'Bố ơi, mai con đi xem bóng đá với Minh được không?' },
        { s: 1, t: 'What time does it start?', vi: 'Mấy giờ bắt đầu?' },
        { s: 0, t: 'At three o\'clock. Minh\'s mum can drive us there.', vi: 'Ba giờ ạ. Mẹ Minh có thể chở bọn con đi.' },
        { s: 1, t: 'OK, but you need to tidy your room first.', vi: 'Được, nhưng con phải dọn phòng trước đã.' },
        { s: 0, t: 'I can do it in the morning. I promise!', vi: 'Con dọn buổi sáng được. Con hứa!' },
        { s: 1, t: 'And how will you get home after the match?', vi: 'Thế xem xong con về nhà bằng cách nào?' },
        { s: 0, t: 'We can take the bus. It stops near our house.', vi: 'Bọn con đi xe buýt. Xe dừng gần nhà mình.' },
        { s: 1, t: 'Fine. Call me when you get on the bus.', vi: 'Được. Lên xe buýt thì gọi bố nhé.' },
        { s: 0, t: 'Thanks, Dad. Can I have some money for a drink?', vi: 'Con cảm ơn bố. Bố cho con ít tiền mua nước nhé?' },
        { s: 1, t: 'Here\'s fifty thousand dong. Don\'t spend it all on snacks!', vi: 'Đây năm mươi nghìn. Đừng tiêu hết vào đồ ăn vặt đấy!' }
      ],
      ex: [
        { type: 'mcq', gist: true, q: 'What are Tom and his dad mainly talking about?', options: ['Tom\'s plans for tomorrow', 'Tom\'s homework', 'A new football team'], answer: 0, line: 0 },
        { type: 'mcq', q: 'What time does the match start?', options: ['At two o\'clock', 'At three o\'clock', 'At four o\'clock'], answer: 1, line: 2 },
        { type: 'mcq', q: 'How will Tom get to the match?', options: ['By bus', 'His dad will drive him', 'Minh\'s mum will drive him'], answer: 2, line: 2 },
        { type: 'who', quote: 'You need to tidy your room first.', answer: 1, line: 3 },
        { type: 'who', quote: 'I can do it in the morning.', answer: 0, line: 4 },
        { type: 'tf', q: 'Tom will come home by bus.', answer: 0, line: 6 },
        { type: 'tf', q: 'Tom\'s dad will go to the match too.', answer: 2, line: 7 },
        { type: 'gap', line: 7, word: 'Call' },
        { type: 'order', items: ['Tom asks to go to the match.', 'Dad asks him to tidy his room.', 'They talk about getting home.', 'Dad gives Tom some money.'] }
      ] },
    { level: 'B1', topic: 'a manager and an employee talking about a deadline', title: 'The report deadline',
      scene: 'Mai works in marketing. Her manager, Mr Carter, comes to her desk on Wednesday morning.',
      speakers: [{ name: 'Mr Carter', role: 'a marketing manager', g: 'm' }, { name: 'Mai', role: 'a marketing assistant', g: 'f' }],
      words: [{ w: 'deadline', m: 'the time by which something must be finished' }, { w: 'figures', m: 'numbers, for example sales numbers' }],
      lines: [
        { s: 0, t: 'Morning, Mai. How is the sales report going?', vi: 'Chào Mai. Báo cáo doanh số đến đâu rồi?' },
        { s: 1, t: 'Good morning. I\'ve finished the first part, but I\'m still waiting for the figures from the Hanoi office.', vi: 'Chào anh. Em xong phần đầu rồi, nhưng vẫn đang chờ số liệu của văn phòng Hà Nội.' },
        { s: 0, t: 'The client wants it by Friday. Do you think you can make it?', vi: 'Khách hàng muốn có trước thứ Sáu. Em nghĩ có kịp không?' },
        { s: 1, t: 'If the figures arrive today, yes. If not, I might need one more day.', vi: 'Nếu hôm nay có số liệu thì kịp. Nếu không, em có thể cần thêm một ngày.' },
        { s: 0, t: 'I\'ll call Hanoi myself after the meeting and ask them to hurry.', vi: 'Họp xong anh sẽ tự gọi Hà Nội bảo họ nhanh lên.' },
        { s: 1, t: 'That would really help. Should I also add the charts from last year?', vi: 'Vậy thì tốt quá. Em có nên thêm biểu đồ của năm ngoái không?' },
        { s: 0, t: 'Yes, the client likes to compare. But keep the report short, ten pages at most.', vi: 'Có, khách thích so sánh. Nhưng giữ báo cáo ngắn thôi, tối đa mười trang.' },
        { s: 1, t: 'Understood. I\'ll send you a draft on Thursday afternoon.', vi: 'Em hiểu rồi. Chiều thứ Năm em sẽ gửi anh bản nháp.' },
        { s: 0, t: 'Perfect. And Mai, don\'t stay too late this week.', vi: 'Tuyệt. À Mai, tuần này đừng ở lại muộn quá nhé.' },
        { s: 1, t: 'Thanks, I\'ll try not to.', vi: 'Em cảm ơn, em sẽ cố.' }
      ],
      ex: [
        { type: 'mcq', gist: true, q: 'What is the main problem?', options: ['Mai is waiting for some numbers', 'The client cancelled the report', 'Mai is ill this week'], answer: 0, line: 1 },
        { type: 'mcq', q: 'When does the client want the report?', options: ['By Thursday', 'By Friday', 'Next Monday'], answer: 1, line: 2 },
        { type: 'mcq', q: 'What will Mr Carter do after the meeting?', options: ['Write the charts', 'Call the Hanoi office', 'Meet the client'], answer: 1, line: 4 },
        { type: 'who', quote: 'I might need one more day.', answer: 1, line: 3 },
        { type: 'who', quote: 'Keep the report short, ten pages at most.', answer: 0, line: 6 },
        { type: 'tf', q: 'The report should be longer than ten pages.', answer: 1, line: 6 },
        { type: 'tf', q: 'Mai has worked at the company for five years.', answer: 2, line: 0 },
        { type: 'gap', line: 7, word: 'draft' },
        { type: 'order', items: ['Mai explains what she is waiting for.', 'Mr Carter offers to call Hanoi.', 'They agree to add last year\'s charts.', 'Mai promises a draft on Thursday.'] }
      ] }
  ];

  /* ---------- checking a lesson (hand-written or from the AI) ---------- */
  function tidy(d, level) {
    if (!d) return null;
    var sp = (d.speakers || []).slice(0, 2).map(function (s) { var o = { name: clean(s && s.name, 20), role: clean(s && s.role, 60), g: s && (s.g === 'f' || s.gender === 'f') ? 'f' : 'm' }; if (s && /^[a-z-]{2,20}$/.test(String(s.av || ''))) o.av = s.av; return o; });
    if (sp.length !== 2 || !okName(sp[0].name) || !okName(sp[1].name) || sp[0].name.toLowerCase() === sp[1].name.toLowerCase()) return null;
    var bounds = LINES[level] || [8, 12], maxW = WORDS_PER_LINE[level] || 20, total = 0;
    var lines = (d.lines || []).map(function (l) { return { s: Number(l && l.s) === 1 ? 1 : 0, t: clean(l && l.t, 260), vi: clean(l && l.vi, 300) }; }).filter(function (l) { return l.t; });
    if (lines.length < bounds[0] - 1 || lines.length > bounds[1] + 2) return null;
    if (!lines.some(function (l) { return l.s === 0; }) || !lines.some(function (l) { return l.s === 1; })) return null;
    lines.forEach(function (l) { total += l.t.length; });
    if (total > CONFIG.AI.TTS_MAX_CHARS - 200 || lines.some(function (l) { return words(l.t) > maxW + 6; })) return null;
    var nL = lines.length, uniq3 = function (o) { return o.length >= 3 && o.filter(function (x, i) { return o.indexOf(x) === i; }).length === o.length; };
    var ex = [];
    (d.ex || []).forEach(function (e) {
      if (!e || !e.type) return;
      var line = Number(e.line); line = line >= 0 && line < nL ? Math.round(line) : -1;
      if (e.type === 'mcq') {
        var o = (e.options || []).map(function (x) { return clean(x, 120); }).filter(Boolean).slice(0, 4), a = Number(e.answer);
        if (clean(e.q, 200) && uniq3(o) && a >= 0 && a < o.length) ex.push({ type: 'mcq', gist: !!e.gist, q: clean(e.q, 200), options: o, answer: a, line: line });
      } else if (e.type === 'who') {
        var quote = clean(e.quote, 220), ans = Number(e.answer);
        if (quote && (ans === 0 || ans === 1)) ex.push({ type: 'who', quote: quote, answer: ans, line: line });
      } else if (e.type === 'tf') {
        var ta = Number(e.answer);
        if (clean(e.q, 200) && ta >= 0 && ta <= 2) ex.push({ type: 'tf', q: clean(e.q, 200), answer: ta, line: line });
      } else if (e.type === 'gap') {
        var w = clean(e.word, 30);
        if (line > -1 && w.length >= 3 && /^[A-Za-z'-]+$/.test(w) && new RegExp('\\b' + w.replace(/[-']/g, '.') + '\\b', 'i').test(lines[line].t) &&
          sp.every(function (s) { return s.name.toLowerCase().indexOf(w.toLowerCase()) < 0; })) ex.push({ type: 'gap', line: line, word: w });
      } else if (e.type === 'order') {
        var it = (e.items || []).map(function (x) { return clean(x, 140); }).filter(Boolean).slice(0, 5);
        if (it.length >= 3 && it.filter(function (x, i) { return it.indexOf(x) === i; }).length === it.length) ex.push({ type: 'order', items: it });
      }
    });
    if (!ex.some(function (e) { return e.type === 'mcq' && e.gist; })) return null;
    if (ex.length < 6) return null;
    var vocab = (d.words || []).map(function (w) { return { w: clean(w && w.w, 40), m: clean(w && w.m, 120) }; }).filter(function (w) { return w.w; }).slice(0, 4);
    return { title: clean(d.title, 80) || 'A conversation', scene: clean(d.scene, 240), speakers: sp, words: vocab, lines: lines, ex: ex };
  }

  /** "Who says this?" items come straight from the lines, so they are always right. */
  function whoItems(lines, avoid) {
    var pick = [], seen = {};
    [0, 1].forEach(function (s) {
      var c = lines.map(function (l, i) { return { l: l, i: i }; }).filter(function (x) { return x.l.s === s && words(x.l.t) >= 5 && avoid.indexOf(x.i) < 0; });
      if (c.length) { var x = c[Math.floor(c.length / 2)]; if (!seen[x.i]) { seen[x.i] = 1; pick.push({ type: 'who', quote: x.l.t, answer: s, line: x.i }); } }
    });
    return pick;
  }

  function store(c, level, topic, source) {
    var row = { QuestionID: Db.newId('q'), Skill: 'listening', Subtype: 'conversation', CEFR: level, DifficultyScore: 50, Stem: c.title,
      Passage: JSON.stringify({ scene: c.scene, speakers: c.speakers, words: c.words, lines: c.lines }), AudioFileId: '',
      OptionsJSON: JSON.stringify(c.ex), CorrectAnswer: '', EvaluationCriteria: clean(topic, 120), Explanation: '', Source: source, Status: 'approved', TimesServed: 0, TimesCorrect: 0, CreatedAt: Db.now() };
    Db.lock(function () { Db.insert(QB, row); });
    return row;
  }

  /** The two lessons above plus the hand-written set in ConversationSeed.gs (10 per level from A2 to C2). */
  function allSeed() { return SEED.concat(typeof CONV_SEED !== 'undefined' ? CONV_SEED : []); }
  /** Adds the hand-written lessons that are not in the bank yet. Returns how many were added. */
  function seed() {
    var have = {}; Db.filter(QB, function (r) { return r.Subtype === 'conversation'; }).forEach(function (r) { have[r.Stem + '|' + r.CEFR] = 1; });
    var n = 0;
    allSeed().forEach(function (x) {
      if (have[x.title + '|' + x.level]) return;
      var ex = x.ex.slice();
      if (!ex.some(function (e) { return e.type === 'who'; })) ex = ex.concat(whoItems(x.lines, ex.filter(function (e) { return e.type === 'gap'; }).map(function (e) { return e.line; })));
      var c = tidy({ title: x.title, scene: x.scene, speakers: x.speakers, words: x.words, lines: x.lines, ex: ex }, x.level);
      if (c) { store(c, x.level, x.topic, 'seed'); n++; }
    });
    return n;
  }

  /* ---------- the AI writes a new lesson ---------- */
  function schema() {
    var str = { type: 'STRING' }, int = { type: 'INTEGER' };
    return { type: 'OBJECT', required: ['title', 'scene', 'speakers', 'words', 'lines', 'gist', 'detail', 'tf', 'gap', 'order'], properties: {
      title: str, scene: str,
      speakers: { type: 'ARRAY', items: { type: 'OBJECT', required: ['name', 'role', 'gender'], properties: { name: str, role: str, gender: { type: 'STRING', enum: ['m', 'f'] } } } },
      words: { type: 'ARRAY', items: { type: 'OBJECT', required: ['w', 'm'], properties: { w: str, m: str } } },
      lines: { type: 'ARRAY', items: { type: 'OBJECT', required: ['s', 't', 'vi'], properties: { s: int, t: str, vi: str } } },
      gist: { type: 'OBJECT', required: ['q', 'options', 'answer'], properties: { q: str, options: { type: 'ARRAY', items: str }, answer: int } },
      detail: { type: 'ARRAY', items: { type: 'OBJECT', required: ['q', 'options', 'answer', 'line'], properties: { q: str, options: { type: 'ARRAY', items: str }, answer: int, line: int } } },
      tf: { type: 'ARRAY', items: { type: 'OBJECT', required: ['statement', 'answer', 'line'], properties: { statement: str, answer: { type: 'STRING', enum: ['true', 'false', 'not given'] }, line: int } } },
      gap: { type: 'OBJECT', required: ['line', 'word'], properties: { line: int, word: str } },
      order: { type: 'ARRAY', items: str }
    } };
  }
  function usedNames() {
    var n = [];
    Db.filter(QB, function (r) { return r.Subtype === 'conversation'; }).slice(-30).forEach(function (r) { (jparse(r.Passage, {}).speakers || []).forEach(function (s) { if (n.indexOf(s.name) < 0) n.push(s.name); }); });
    return n;
  }
  function usedTopics(level) { return Db.filter(QB, function (r) { return r.Subtype === 'conversation' && r.CEFR === level; }).map(function (r) { return String(r.EvaluationCriteria); }); }

  /** Writes one lesson at a level with the AI and checks it with a second model. Returns {asked, approved, model}. */
  function make(level) {
    level = CONFIG.LEVELS.indexOf(level) > -1 ? level : 'A2';
    var done = usedTopics(level), pool = TOPICS.filter(function (t) { return done.indexOf(t) < 0; });
    var topic = (pool.length ? pool : TOPICS)[Math.floor(Math.random() * (pool.length || TOPICS.length))];
    var b = LINES[level], names = usedNames();
    var gen = AI.generateJson('QUESTION_GENERATION', {
      system: 'You write natural, correct English listening lessons for Vietnamese adult learners. Output JSON only.',
      schema: schema(), temperature: 0.9, maxOutputTokens: 6000,
      validate: function (d) { return d && Array.isArray(d.lines) && d.lines.length >= b[0] && d.gist && Array.isArray(d.detail) ? '' : 'lines, gist or detail missing'; },
      prompt: 'Write one listening lesson: a conversation between two people.\nCEFR level: ' + level + '. Topic: ' + topic + '.\n' +
        '- "speakers": exactly two people. Give each a real first name, or a natural role name such as Dad, Mum, Grandma or Doctor (for example "Tom" and "Dad"). Never "A" and "B". ' +
        'Use new names, not these: ' + (names.join(', ') || 'none') + '. "role" says who they are in a few words. "gender" is "m" or "f".\n' +
        '- "scene": one sentence that sets the scene, using their names.\n' +
        '- "lines": ' + b[0] + ' to ' + b[1] + ' turns, alternating naturally ("s" is 0 for the first speaker, 1 for the second). Each turn at most ' + WORDS_PER_LINE[level] + ' words, vocabulary and grammar at ' + level + '. ' +
        'Real, everyday spoken English with some details (times, places, numbers, reasons) that questions can ask about. "vi" is a natural Vietnamese translation of the turn.\n' +
        '- "words": 2 or 3 useful words from the conversation, "m" a short simple English meaning.\n' +
        '- "gist": one question about the main idea, 3 "options", "answer" is the index of the right one.\n' +
        '- "detail": 3 questions about details, 3 options each, "answer" index, "line" the index of the turn that answers it.\n' +
        '- "tf": 3 statements: one true, one false, one the conversation does not say ("not given"). "line" is the turn that answers it (for "not given", the closest turn).\n' +
        '- "gap": one important word (3+ letters, not a name) from one turn: "line" is the turn index, "word" exactly as written.\n' +
        '- "order": four short events of the conversation, in the order they happen.\n' +
        'Every question must have exactly one right answer from the conversation alone.'
    });
    var d = gen.data, sp = (d.speakers || []).map(function (s) { return { name: s.name, role: s.role, g: s.gender }; });
    var ex = [];
    if (d.gist) ex.push({ type: 'mcq', gist: true, q: d.gist.q, options: d.gist.options, answer: d.gist.answer, line: 0 });
    (d.detail || []).forEach(function (x) { ex.push({ type: 'mcq', q: x.q, options: x.options, answer: x.answer, line: x.line }); });
    (d.tf || []).forEach(function (x) { ex.push({ type: 'tf', q: x.statement, answer: ['true', 'false', 'not given'].indexOf(String(x.answer).toLowerCase()), line: x.line }); });
    if (d.gap) ex.push({ type: 'gap', line: d.gap.line, word: d.gap.word });
    if (d.order && d.order.length) ex.push({ type: 'order', items: d.order });
    var c = tidy({ title: d.title, scene: d.scene, speakers: sp, words: d.words, lines: d.lines, ex: ex }, level);
    if (!c) { console.log('conversation dropped (shape)'); return { asked: 1, approved: 0, model: gen.model }; }
    // a second model answers on its own; questions it answers differently are dropped
    try {
      var mc = c.ex.filter(function (e) { return e.type === 'mcq'; }), tfs = c.ex.filter(function (e) { return e.type === 'tf'; }), ord = c.ex.filter(function (e) { return e.type === 'order'; })[0];
      var shuffled = ord ? Util.shuffle(ord.items.map(function (t, i) { return i; })) : [];
      var v = AI.generateJson('QUESTION_VERIFY', {
        system: 'You answer listening comprehension questions using only the transcript. Output JSON only.', temperature: 0,
        schema: { type: 'OBJECT', required: ['mcq', 'tf', 'order'], properties: { mcq: { type: 'ARRAY', items: { type: 'INTEGER' } }, tf: { type: 'ARRAY', items: { type: 'STRING', enum: ['true', 'false', 'not given'] } }, order: { type: 'ARRAY', items: { type: 'INTEGER' } } } },
        validate: function (x) { return x && Array.isArray(x.mcq) && x.mcq.length === mc.length && Array.isArray(x.tf) ? '' : 'answers missing'; },
        prompt: 'Answer these listening questions about the transcript.\nTranscript:\n' + c.lines.map(function (l) { return c.speakers[l.s].name + ': ' + l.t; }).join('\n') + '\n\n' +
          'Multiple choice (give the index of the right option, from 0):\n' + mc.map(function (e, i) { return (i + 1) + '. ' + e.q + ' ' + e.options.map(function (o, k) { return '[' + k + '] ' + o; }).join(' '); }).join('\n') + '\n\n' +
          'True, false or not given:\n' + tfs.map(function (e, i) { return (i + 1) + '. ' + e.q; }).join('\n') + '\n\n' +
          (ord ? 'Put these events in the order they happen (give their numbers in order):\n' + shuffled.map(function (k) { return '[' + k + '] ' + ord.items[k]; }).join('\n') : 'There are no events to order; return an empty list.') +
          '\n\nReturn JSON: {"mcq":[0],"tf":["true"],"order":[0,1,2,3]}'
      });
      var keep = [];
      c.ex.forEach(function (e) {
        if (e.type === 'mcq') { if (Number(v.data.mcq[mc.indexOf(e)]) === e.answer) keep.push(e); else if (e.gist) throw new Error('gist disagreed'); }
        else if (e.type === 'tf') { if (TF.map(function (x) { return x.toLowerCase(); }).indexOf(String(v.data.tf[tfs.indexOf(e)]).toLowerCase()) === e.answer) keep.push(e); }
        else if (e.type === 'order') { if ((v.data.order || []).join(',') === e.items.map(function (t, i) { return i; }).join(',')) keep.push(e); }
        else keep.push(e);
      });
      c.ex = keep;
    } catch (e) { console.log('conversation dropped (check): ' + (e && e.message)); return { asked: 1, approved: 0, model: gen.model }; }
    c.ex = c.ex.concat(whoItems(c.lines, c.ex.filter(function (e) { return e.type === 'gap'; }).map(function (e) { return e.line; })));
    if (c.ex.length < 6) return { asked: 1, approved: 0, model: gen.model };
    store(c, level, topic, 'ai');
    return { asked: 1, approved: 1, model: gen.model };
  }

  function counts() {
    var n = {}; Db.filter(QB, function (r) { return r.Subtype === 'conversation' && r.Status === 'approved'; }).forEach(function (r) { n[r.CEFR] = (n[r.CEFR] || 0) + 1; });
    return n;
  }

  /* ---------- a learner's session ---------- */
  function lessonOf(row) {
    var p = jparse(row.Passage, {});
    return { id: row.QuestionID, level: row.CEFR, title: row.Stem, scene: p.scene || '', speakers: p.speakers || [], words: p.words || [], lines: p.lines || [], ex: jparse(row.OptionsJSON, []) };
  }
  /** The exercises as the browser sees them: no answers; "order" events shuffled. */
  /**
   * The exercises shown in a lesson: all of them, except that only one true / false / not given question is kept
   * (learners found several of them tiring). Returns the indexes into L.ex.
   */
  function active(L) {
    var tf = 0, out = [];
    L.ex.forEach(function (e, i) { if (e.type === 'tf' && tf++ >= 1) return; out.push(i); });
    return out;
  }
  /* The right answers go to the browser too, so a choice is marked at once (this is practice, not a test);
     the server still checks every answer and keeps the score. */
  function publicEx(L, st) {
    var on = active(L);
    return L.ex.map(function (e, i) {
      if (on.indexOf(i) < 0) return null;
      var o = pub(e, i);
      o.key = e.type === 'gap' ? e.word : e.type === 'order' ? null : e.answer;
      return o;
    }).filter(Boolean);
    function pub(e, i) {
      if (e.type === 'mcq') return { i: i, type: 'mcq', gist: !!e.gist, q: e.q, options: e.options };
      if (e.type === 'tf') return { i: i, type: 'tf', q: e.q, options: TF };
      if (e.type === 'who') return { i: i, type: 'who', quote: e.quote, options: [L.speakers[0].name, L.speakers[1].name] };
      if (e.type === 'gap') { var t = L.lines[e.line].t, re = new RegExp('\\b' + e.word.replace(/[-']/g, '.') + '\\b', 'i'), m = t.match(re); return { i: i, type: 'gap', line: e.line, speaker: L.lines[e.line].s, before: t.slice(0, m.index), after: t.slice(m.index + m[0].length), size: e.word.length }; }
      return { i: i, type: 'order', items: (st.order[i] || []).map(function (k) { return { k: k, t: e.items[k] }; }) };
    }
  }
  function view(sid, st, L, resumed) {
    var ex = publicEx(L, st);
    // the gist question comes first, "order" last
    ex.sort(function (a, b) { var r = function (e) { return e.gist ? 0 : e.type === 'order' ? 9 : e.type === 'gap' ? 7 : e.type === 'tf' ? 5 : e.type === 'who' ? 3 : 1; }; return r(a) - r(b) || a.i - b.i; });
    return { sessionId: sid, resumed: !!resumed, lesson: { id: L.id, level: L.level, title: L.title, scene: L.scene, speakers: L.speakers, words: L.words, lines: L.lines }, exercises: ex, tap: tapWords(L),
      answered: Object.keys(st.answers).map(function (k) { var a = st.answers[k]; return { i: Number(k), answer: a.answer, correct: a.correct, key: a.key, line: a.line }; }) };
  }
  /** Words a learner can tap for the meaning: the lesson's key words and words that are in the WordBank. */
  function tapWords(L) {
    var text = [L.scene].concat(L.lines.map(function (l) { return l.t; })).join(' ');
    var out = []; try { out = Words.known(text); } catch (e) {}
    return { bank: out, key: (L.words || []).map(function (w) { return String(w.w).toLowerCase(); }) };
  }
  function seenLessons(uid) {
    var s = {}; Db.filter(CONFIG.SHEETS.TEST_SESSIONS, function (r) { return String(r.UserID) === uid && r.Type === TYPE; }).forEach(function (r) { var st = jparse(r.EngineStateJSON, null); if (st && st.lessonId) s[st.lessonId] = (s[st.lessonId] || 0) + 1; });
    return s;
  }

  /** api: convStart - resumes an open conversation, or starts a new one at the learner's Listening level. */
  function start(user) {
    var uid = user.UserID, now = Date.now(), stale = CONFIG.PRACTICE.SESSION_STALE_MINUTES * 60000, resume = null;
    Db.lock(function () {
      Db.filter(CONFIG.SHEETS.TEST_SESSIONS, function (r) { return String(r.UserID) === uid && r.Type === TYPE && r.Status === 'in_progress'; }).forEach(function (r) {
        if (!resume && now - new Date(r.StartedAt).getTime() < stale && jparse(r.EngineStateJSON, null)) resume = r;
        else Db.update(CONFIG.SHEETS.TEST_SESSIONS, r._row, { Status: 'abandoned' });
      });
    });
    if (resume) { var rs = jparse(resume.EngineStateJSON, {}), rr = Db.findByKey(QB, 'QuestionID', rs.lessonId); if (rr) return view(resume.SessionID, rs, lessonOf(rr), true); }
    // new hand-written lessons arrive with an update of the code: add them once (checked at most every 6 hours)
    var ck = CacheService.getScriptCache(), sk = 'conv_seed_' + allSeed().length;
    if (!ck.get(sk)) { seed(); ck.put(sk, '1', 21600); }
    var lv = Plan.levelsOf(uid).listening, level = CONFIG.LEVELS[lv.idx], seen = seenLessons(uid);
    var all = function () { return Db.filter(QB, function (r) { return r.Subtype === 'conversation' && r.Status === 'approved'; }); };
    var rows = all();
    if (!rows.some(function (r) { return r.CEFR === level && !seen[r.QuestionID]; })) {
      try { if (make(level).approved) rows = all(); } catch (e) { console.log('conversation top-up skipped: ' + (e && e.message)); }
    }
    if (!rows.length) throw new AppError('Conversations are still being prepared. Please try again in a few minutes.');
    var best = rows.map(function (r) { return { r: r, k: (seen[r.QuestionID] || 0) * 30 + Math.abs(levelIdx(r.CEFR) - lv.idx) * 10 + Math.random() * 3 }; }).sort(function (a, b) { return a.k - b.k; })[0].r;
    var L = lessonOf(best), st = { lessonId: L.id, answers: {}, startedAt: now, order: {} };
    L.ex.forEach(function (e, i) { if (e.type === 'order') { var o = e.items.map(function (t, k) { return k; }); do { o = Util.shuffle(o); } while (o.join() === e.items.map(function (t, k) { return k; }).join()); st.order[i] = o; } });
    var id = Db.newId('ses');
    Db.lock(function () {
      Db.insert(CONFIG.SHEETS.TEST_SESSIONS, { SessionID: id, UserID: uid, Type: TYPE, Status: 'in_progress', StartedAt: Db.now(), EngineStateJSON: JSON.stringify(st), ItemsServedJSON: JSON.stringify([L.id]) });
      Db.update(QB, best._row, { TimesServed: (Number(best.TimesServed) || 0) + 1 });
    });
    return view(id, st, L, false);
  }

  function normWord(w) { return String(w || '').toLowerCase().replace(/[^a-z']/g, ''); }

  /** api: convAnswer {sessionId, i, answer} - answer is an option index, a word (gap) or a list of event numbers (order). */
  function answer(user, p) {
    var uid = user.UserID, sid = String(p.sessionId || ''), out = null;
    Db.lock(function () {
      var row = Db.findByKey(CONFIG.SHEETS.TEST_SESSIONS, 'SessionID', sid);
      if (!row || String(row.UserID) !== uid || row.Type !== TYPE || row.Status !== 'in_progress') throw new AppError('This conversation has ended. Start a new one.', 'invalid');
      var st = jparse(row.EngineStateJSON, {}), q = Db.findByKey(QB, 'QuestionID', st.lessonId), L = lessonOf(q), i = Math.round(Number(p.i)), e = L.ex[i];
      if (!e || active(L).indexOf(i) < 0) throw new AppError('That question is not part of this conversation.', 'invalid');
      if (st.answers[i]) throw new AppError('You already answered this one.', 'invalid');
      var correct, key, given = p.answer;
      if (e.type === 'gap') { correct = normWord(given) === normWord(e.word); key = e.word; given = clean(given, 40); }
      else if (e.type === 'order') {
        var seq = (Array.isArray(given) ? given : []).map(Number);
        correct = seq.length === e.items.length && seq.every(function (k, j) { return k === j; }); key = e.items; given = seq;
      } else { var c = Math.round(Number(given)); correct = c === e.answer; key = e.answer; given = c; }
      st.answers[i] = { answer: given, correct: correct, key: key, line: e.line == null ? -1 : e.line };
      Db.insert(CONFIG.SHEETS.TEST_ANSWERS, { AnswerID: Db.newId('ans'), SessionID: sid, UserID: uid, QuestionID: L.id, Skill: 'listening', Answer: JSON.stringify(given), IsCorrect: correct, Score: correct ? 1 : 0,
        ResponseMs: Util.clamp(Math.round(Number(p.ms) || 0), 0, 600000), Difficulty: '', ThetaAfter: '', AIScoreJSON: '', CreatedAt: Db.now() });
      out = { correct: correct, key: key, line: e.line == null ? -1 : e.line, done: false };
      if (Object.keys(st.answers).length >= active(L).length) {
        var b = Engine.itemTheta(L.level, 50), res = Object.keys(st.answers).map(function (k) { return { correct: st.answers[k].correct, b: b }; });
        out.summary = Practice.scoreSet(user, 'listening', res, st.startedAt, 'Listening conversation: ' + L.title, [L.id], CONFIG.PRACTICE.LISTEN_WEIGHT.conversation);
        out.done = true; st.final = out.summary;
        Db.update(CONFIG.SHEETS.TEST_SESSIONS, row._row, { Status: 'completed', CompletedAt: Db.now(), EngineStateJSON: JSON.stringify(st) });
        Db.update(QB, q._row, { TimesCorrect: (Number(q.TimesCorrect) || 0) + out.summary.right });
      } else Db.update(CONFIG.SHEETS.TEST_SESSIONS, row._row, { EngineStateJSON: JSON.stringify(st) });
    });
    return out;
  }

  return { start: start, answer: answer, make: make, seed: seed, counts: counts, tidy: tidy, SEED: SEED, TOPICS: TOPICS };
})();
