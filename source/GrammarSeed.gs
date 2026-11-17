/**
 * GrammarSeed.gs
 * Grammar lessons written by hand, so a lesson opens at once and needs no AI call.
 * Grammar.gs uses a lesson from here when there is one; topics without one are still written by the AI.
 * When a learner has used every writing item of a lesson, the AI adds more (see Grammar.gs, extend).
 *
 * Short form of one lesson (expanded by GrammarSeed.get):
 *   rule:  [English, Vietnamese]
 *   forms: patterns
 *   ex:    [English sentence, Vietnamese translation]
 *   mis:   [wrong, right, why in English, why in Vietnamese]
 *   warm:  [sentence with ___, [the right option FIRST, then wrong ones], why EN, why VI]
 *   write: [type f (fix) | t (transform) | v (translate from Vietnamese), instruction (t only), prompt, [accepted answers, best first], focus, why EN, why VI]
 *          The first 6 are the first lesson; the rest are used by reviews.
 *   free:  [English, Vietnamese]
 * Bump VERSION after editing a lesson: sheets that hold an older seed copy are then refreshed.
 */
var GrammarSeed = (function () {
  var VERSION = 1, L = {}, TYPE = { f: 'fix', t: 'transform', v: 'translate' };
  function two(a, b) { return { en: a || '', vi: b || '' }; }
  function add(id, s) { L[id] = s; }
  function has(id) { return !!L[id]; }
  function ids() { return Object.keys(L); }
  /** The lesson in the shape Grammar.gs stores, or null. */
  function get(id) {
    var s = L[id]; if (!s) return null;
    return {
      rule: two(s.rule[0], s.rule[1]), forms: s.forms.slice(),
      examples: s.ex.map(function (e) { return two(e[0], e[1]); }),
      mistakes: s.mis.map(function (m) { return { wrong: m[0], right: m[1], why: two(m[2], m[3]) }; }),
      warm: s.warm.map(function (w) { return { sentence: w[0], options: w[1].slice(), why: two(w[2], w[3]) }; }),
      write: s.write.map(function (w) { return { type: TYPE[w[0]], instruction: w[1], prompt: w[2], answers: w[3].slice(), focus: w[4], why: two(w[5], w[6]) }; }),
      free: two(s.free[0], s.free[1])
    };
  }

  /* ============================== A2 ============================== */
  add('past-simple', {
    rule: ["Use the past simple for actions that started and finished in the past, often with a time word such as yesterday, last week or in 2020. Regular verbs add -ed. Many common verbs are irregular (go - went, have - had). Negatives and questions use did + the base verb.",
      "Dùng thì quá khứ đơn cho hành động đã bắt đầu và kết thúc trong quá khứ, thường đi với từ chỉ thời gian như yesterday, last week, in 2020. Động từ có quy tắc thêm -ed. Nhiều động từ thông dụng là bất quy tắc (go - went, have - had). Câu phủ định và câu hỏi dùng did + động từ nguyên mẫu."],
    forms: ["Subject + verb-ed / irregular past form", "Subject + did not (didn't) + base verb", "Did + subject + base verb?"],
    ex: [["I sent the report yesterday.", "Tôi đã gửi báo cáo hôm qua."], ["She didn't come to the meeting.", "Cô ấy đã không đến cuộc họp."], ["Did you call the client last week?", "Tuần trước bạn có gọi cho khách hàng không?"], ["We went to Da Nang in 2022.", "Chúng tôi đã đi Đà Nẵng năm 2022."]],
    mis: [["I go to the office yesterday.", "I went to the office yesterday.", "A finished past time needs the past form.", "Thời gian đã qua thì động từ phải ở dạng quá khứ."],
      ["She didn't went home.", "She didn't go home.", "After didn't, use the base verb.", "Sau didn't dùng động từ nguyên mẫu."],
      ["Did you finished the task?", "Did you finish the task?", "After did, use the base verb.", "Sau did dùng động từ nguyên mẫu."]],
    warm: [["We ___ the contract last Monday.", ["signed", "sign", "signing", "have sign"], "Last Monday is a finished time.", "Last Monday là thời điểm đã qua."],
      ["He didn't ___ my email.", ["answer", "answered", "answers", "answering"], "didn't + base verb.", "didn't + động từ nguyên mẫu."],
      ["___ you see the manager yesterday?", ["Did", "Do", "Were", "Have"], "Past simple questions use did.", "Câu hỏi quá khứ đơn dùng did."],
      ["I ___ a new phone two days ago.", ["bought", "buyed", "buy", "was buy"], "Buy is irregular: bought.", "Buy là động từ bất quy tắc: bought."]],
    write: [
      ["f", "", "I meet the new manager yesterday.", ["I met the new manager yesterday."], "met", "Yesterday is finished, so meet becomes met.", "Yesterday đã qua nên meet đổi thành met."],
      ["f", "", "She didn't called me last night.", ["She didn't call me last night."], "didn't call", "After didn't, use the base verb.", "Sau didn't dùng động từ nguyên mẫu."],
      ["t", "Make it negative.", "They finished the project on time.", ["They didn't finish the project on time."], "didn't finish", "Negative: didn't + base verb.", "Phủ định: didn't + động từ nguyên mẫu."],
      ["v", "", "Hôm qua tôi đã gửi email cho khách hàng.", ["I sent an email to the client yesterday.", "I sent the client an email yesterday.", "Yesterday I sent an email to the client.", "Yesterday I sent the client an email.", "I emailed the client yesterday."], "sent", "Send is irregular: sent.", "Send là động từ bất quy tắc: sent."],
      ["f", "", "Did you went to the meeting this morning?", ["Did you go to the meeting this morning?"], "Did you go", "After did, use the base verb.", "Sau did dùng động từ nguyên mẫu."],
      ["v", "", "Tuần trước chúng tôi không làm việc vào thứ Bảy.", ["We didn't work on Saturday last week.", "Last week we didn't work on Saturday.", "Last week, we didn't work on Saturday."], "didn't work", "Negative: didn't + base verb.", "Phủ định: didn't + động từ nguyên mẫu."],
      ["f", "", "He buyed a new laptop last month.", ["He bought a new laptop last month."], "bought", "Buy is irregular: bought.", "Buy là động từ bất quy tắc: bought."],
      ["t", "Make it a question.", "She left the office at six.", ["Did she leave the office at six?"], "Did she leave", "Question: Did + subject + base verb.", "Câu hỏi: Did + chủ ngữ + động từ nguyên mẫu."],
      ["v", "", "Hôm qua bạn đã ăn trưa ở đâu?", ["Where did you have lunch yesterday?", "Where did you eat lunch yesterday?"], "did you have", "Question word + did + subject + base verb.", "Từ để hỏi + did + chủ ngữ + động từ nguyên mẫu."],
      ["f", "", "We was very busy last week.", ["We were very busy last week."], "were", "We, you, they take were.", "We, you, they đi với were."],
      ["t", "Rewrite in the past with: yesterday", "I write three emails.", ["I wrote three emails yesterday.", "Yesterday I wrote three emails.", "Yesterday, I wrote three emails."], "wrote", "Write is irregular: wrote.", "Write là động từ bất quy tắc: wrote."],
      ["v", "", "Sáng nay anh ấy đã không nghe điện thoại.", ["He didn't answer the phone this morning.", "This morning he didn't answer the phone.", "He didn't pick up the phone this morning.", "This morning, he didn't answer the phone."], "didn't answer", "Negative: didn't + base verb.", "Phủ định: didn't + động từ nguyên mẫu."]
    ],
    free: ["Write 3 to 5 sentences about what you did yesterday or last weekend.", "Viết 3 đến 5 câu về những việc bạn đã làm hôm qua hoặc cuối tuần trước."]
  });

  add('present-continuous', {
    rule: ["Use the present continuous for something happening now or around now, for temporary situations, and for fixed plans in the near future. Form it with am, is or are + verb-ing. Do not use it with state verbs such as know, like, want, need or understand: use the present simple for those.",
      "Dùng thì hiện tại tiếp diễn cho việc đang xảy ra lúc nói hoặc quanh thời điểm này, cho tình huống tạm thời, và cho kế hoạch đã sắp xếp trong tương lai gần. Cấu tạo: am, is hoặc are + động từ thêm -ing. Không dùng với động từ chỉ trạng thái như know, like, want, need, understand: các động từ này dùng hiện tại đơn."],
    forms: ["Subject + am / is / are + verb-ing", "Subject + am not / isn't / aren't + verb-ing", "Am / Is / Are + subject + verb-ing?"],
    ex: [["I am writing an email now.", "Bây giờ tôi đang viết email."], ["She is working from home this week.", "Tuần này cô ấy đang làm việc ở nhà."], ["Are they waiting for us?", "Họ đang đợi chúng ta à?"], ["We are meeting the client tomorrow.", "Ngày mai chúng tôi sẽ gặp khách hàng."]],
    mis: [["She working now.", "She is working now.", "The verb be is missing.", "Thiếu động từ be."],
      ["I am knowing the answer.", "I know the answer.", "Know is a state verb: no -ing form.", "Know là động từ chỉ trạng thái, không dùng dạng -ing."],
      ["He is write a report.", "He is writing a report.", "After is, the verb needs -ing.", "Sau is, động từ phải thêm -ing."]],
    warm: [["Please be quiet. The baby ___.", ["is sleeping", "sleeps", "sleeping", "is sleep"], "It is happening now.", "Việc đang xảy ra lúc nói."],
      ["I ___ what you mean.", ["understand", "am understanding", "understanding", "am understand"], "Understand is a state verb.", "Understand là động từ chỉ trạng thái."],
      ["What ___ you doing at the moment?", ["are", "do", "is", "does"], "You takes are.", "You đi với are."],
      ["They ___ in a hotel this week.", ["are staying", "stays", "is staying", "staying"], "A temporary situation; they takes are.", "Tình huống tạm thời; they đi với are."]],
    write: [
      ["f", "", "I writing a report at the moment.", ["I am writing a report at the moment."], "am writing", "The verb be is missing.", "Thiếu động từ be."],
      ["f", "", "She is wanting a cup of coffee.", ["She wants a cup of coffee."], "wants", "Want is a state verb: use the present simple.", "Want là động từ chỉ trạng thái: dùng hiện tại đơn."],
      ["t", "Make it negative.", "He is working today.", ["He isn't working today.", "He's not working today."], "isn't working", "Negative: is not + verb-ing.", "Phủ định: is not + động từ thêm -ing."],
      ["v", "", "Bây giờ chúng tôi đang họp.", ["We are having a meeting now.", "We are in a meeting now.", "We are having a meeting right now.", "We are meeting now.", "Now we are having a meeting."], "are having", "Happening now: are + verb-ing.", "Đang xảy ra: are + động từ thêm -ing."],
      ["f", "", "They is waiting for the bus.", ["They are waiting for the bus."], "are waiting", "They takes are.", "They đi với are."],
      ["v", "", "Tuần này tôi đang làm việc ở nhà.", ["I am working from home this week.", "This week I am working from home.", "I am working at home this week.", "This week, I am working from home."], "am working", "A temporary situation.", "Tình huống tạm thời."],
      ["f", "", "Are you listen to me?", ["Are you listening to me?"], "listening", "After are, the verb needs -ing.", "Sau are, động từ phải thêm -ing."],
      ["t", "Make it a question.", "She is talking to the manager.", ["Is she talking to the manager?"], "Is she talking", "Question: Is + subject + verb-ing.", "Câu hỏi: Is + chủ ngữ + động từ thêm -ing."],
      ["v", "", "Bạn đang làm gì vậy?", ["What are you doing?", "What are you doing now?", "What are you doing right now?"], "are you doing", "Question word + are + subject + verb-ing.", "Từ để hỏi + are + chủ ngữ + động từ thêm -ing."],
      ["f", "", "He is runing to the station.", ["He is running to the station."], "running", "Run doubles the n: running.", "Run gấp đôi chữ n: running."],
      ["t", "Rewrite with: at the moment", "I read a book.", ["I am reading a book at the moment.", "At the moment I am reading a book.", "At the moment, I am reading a book."], "am reading", "At the moment needs the continuous.", "At the moment dùng với thì tiếp diễn."],
      ["v", "", "Ngày mai tôi sẽ gặp bác sĩ lúc 9 giờ (đã hẹn).", ["I am seeing the doctor at 9 tomorrow.", "I am seeing the doctor at nine tomorrow.", "I am seeing the doctor tomorrow at 9.", "I am meeting the doctor at 9 tomorrow.", "Tomorrow I am seeing the doctor at 9."], "am seeing", "A fixed plan: present continuous.", "Kế hoạch đã hẹn: hiện tại tiếp diễn."]
    ],
    free: ["Write 3 to 5 sentences about what you and the people around you are doing right now, or about your plans for this week.", "Viết 3 đến 5 câu về việc bạn và những người xung quanh đang làm lúc này, hoặc về kế hoạch của bạn trong tuần này."]
  });

  add('subject-verb-agreement', {
    rule: ["The verb must match its subject. In the present simple, he, she, it and singular nouns take a verb with -s (works, has, does, is). I, you, we, they and plural nouns take the base verb (work, have, do, are). Everyone, everybody, someone and each are singular. People is plural. With there is and there are, the verb matches the noun that follows.",
      "Động từ phải hòa hợp với chủ ngữ. Ở hiện tại đơn, he, she, it và danh từ số ít đi với động từ thêm -s (works, has, does, is). I, you, we, they và danh từ số nhiều đi với động từ nguyên mẫu (work, have, do, are). Everyone, everybody, someone và each là số ít. People là số nhiều. Với there is và there are, động từ theo danh từ đứng sau."],
    forms: ["He / She / It / singular noun + verb-s", "I / You / We / They / plural noun + base verb", "Everyone / Each + singular verb", "There is + singular; There are + plural"],
    ex: [["My manager works in Hanoi.", "Quản lý của tôi làm việc ở Hà Nội."], ["The people in my team are friendly.", "Mọi người trong nhóm tôi rất thân thiện."], ["Everyone has a laptop.", "Ai cũng có một chiếc laptop."], ["There are two meetings today.", "Hôm nay có hai cuộc họp."]],
    mis: [["She work in a bank.", "She works in a bank.", "She needs a verb with -s.", "She đi với động từ thêm -s."],
      ["Everyone are here.", "Everyone is here.", "Everyone is singular.", "Everyone là số ít."],
      ["He don't like coffee.", "He doesn't like coffee.", "He takes doesn't.", "He đi với doesn't."]],
    warm: [["My brother ___ in a hotel.", ["works", "work", "working", "are working"], "My brother = he: verb + s.", "My brother = he: động từ thêm -s."],
      ["The people in this office ___ very kind.", ["are", "is", "be", "was"], "People is plural.", "People là số nhiều."],
      ["She ___ like spicy food.", ["doesn't", "don't", "isn't", "not"], "She takes doesn't.", "She đi với doesn't."],
      ["There ___ a problem with the printer.", ["is", "are", "have", "be"], "A problem is singular.", "A problem là số ít."]],
    write: [
      ["f", "", "My sister work in a hospital.", ["My sister works in a hospital."], "works", "My sister = she: verb + s.", "My sister = she: động từ thêm -s."],
      ["f", "", "He don't have a car.", ["He doesn't have a car."], "doesn't have", "He takes doesn't.", "He đi với doesn't."],
      ["t", "Change the subject to: She", "I have two meetings today.", ["She has two meetings today."], "has", "She takes has.", "She đi với has."],
      ["v", "", "Mọi người trong nhóm tôi đều nói tiếng Anh.", ["Everyone in my team speaks English.", "Everybody in my team speaks English.", "Everyone on my team speaks English.", "Everybody on my team speaks English."], "speaks", "Everyone is singular: speaks.", "Everyone là số ít: speaks."],
      ["f", "", "The people in my company is very friendly.", ["The people in my company are very friendly."], "are", "People is plural.", "People là số nhiều."],
      ["v", "", "Có ba người trong phòng họp.", ["There are three people in the meeting room."], "There are", "Three people is plural: there are.", "Three people là số nhiều: there are."],
      ["f", "", "Does your parents live in Hanoi?", ["Do your parents live in Hanoi?"], "Do your parents", "Parents is plural: do.", "Parents là số nhiều: do."],
      ["t", "Change the subject to: My manager", "They start work at eight.", ["My manager starts work at eight."], "starts", "My manager = he or she: verb + s.", "My manager = he hoặc she: động từ thêm -s."],
      ["v", "", "Mỗi nhân viên có một cái bàn riêng.", ["Each employee has their own desk.", "Each employee has his or her own desk.", "Every employee has their own desk.", "Each employee has a separate desk.", "Each employee has a desk of their own."], "has", "Each is singular: has.", "Each là số ít: has."],
      ["f", "", "There is many emails in my inbox.", ["There are many emails in my inbox."], "There are", "Many emails is plural.", "Many emails là số nhiều."],
      ["t", "Make it negative.", "She likes her new job.", ["She doesn't like her new job."], "doesn't like", "doesn't + base verb, no -s.", "doesn't + động từ nguyên mẫu, không thêm -s."],
      ["v", "", "Anh trai tôi và tôi làm cùng một công ty.", ["My brother and I work for the same company.", "My brother and I work at the same company.", "My brother and I work in the same company."], "work", "Two people = plural: work.", "Hai người = số nhiều: work."]
    ],
    free: ["Write 3 to 5 sentences about the people you work or live with: what each person does every day.", "Viết 3 đến 5 câu về những người bạn làm việc hoặc sống cùng: mỗi người làm gì hằng ngày."]
  });

  add('future', {
    rule: ["Use will for a decision you make at the moment of speaking, for promises and offers, and for predictions you believe. Use be going to for plans you already made, and for predictions from something you can see now. After will, and after going to, use the base verb.",
      "Dùng will cho quyết định ngay lúc nói, cho lời hứa và lời đề nghị giúp đỡ, và cho dự đoán theo suy nghĩ của mình. Dùng be going to cho kế hoạch đã có từ trước, và cho dự đoán dựa trên điều đang thấy. Sau will và sau going to dùng động từ nguyên mẫu."],
    forms: ["Subject + will ('ll) + base verb", "Subject + will not (won't) + base verb", "Subject + am / is / are + going to + base verb", "Will + subject + base verb? / Are you going to + base verb?"],
    ex: [["I'll send you the file in a minute.", "Tôi sẽ gửi file cho bạn ngay."], ["We are going to open a new office next year.", "Năm sau chúng tôi sẽ mở văn phòng mới."], ["I think it will rain tonight.", "Tôi nghĩ tối nay trời sẽ mưa."], ["Look at those clouds. It is going to rain.", "Nhìn mây kìa. Trời sắp mưa rồi."]],
    mis: [["I will to call you.", "I will call you.", "No to after will.", "Sau will không có to."],
      ["She will comes tomorrow.", "She will come tomorrow.", "After will, use the base verb.", "Sau will dùng động từ nguyên mẫu."],
      ["I going to visit my parents.", "I am going to visit my parents.", "Be is missing before going to.", "Thiếu be trước going to."]],
    warm: [["The phone is ringing. I ___ it.", ["will answer", "am going to answer", "answer", "answering"], "A decision made now: will.", "Quyết định ngay lúc nói: will."],
      ["We ___ move house next month. We found a flat last week.", ["are going to", "will to", "going to", "are go to"], "A plan already made: be going to.", "Kế hoạch đã có: be going to."],
      ["Don't worry, I ___ tell anyone.", ["won't", "don't", "am not", "not will"], "A promise: will not = won't.", "Lời hứa: will not = won't."],
      ["___ you going to join the meeting?", ["Are", "Will", "Do", "Is"], "Be going to: Are you going to.", "Be going to: Are you going to."]],
    write: [
      ["f", "", "I will to send the report tomorrow.", ["I will send the report tomorrow."], "will send", "No to after will.", "Sau will không có to."],
      ["f", "", "She going to start a new job next week.", ["She is going to start a new job next week."], "is going to start", "Be is missing before going to.", "Thiếu be trước going to."],
      ["t", "Make it negative.", "He will be at the meeting.", ["He won't be at the meeting.", "He will not be at the meeting."], "won't be", "Negative: will not = won't.", "Phủ định: will not = won't."],
      ["v", "", "Năm sau chúng tôi sẽ mở một văn phòng mới (đã lên kế hoạch).", ["We are going to open a new office next year.", "Next year we are going to open a new office.", "Next year, we are going to open a new office."], "are going to open", "A plan already made: be going to.", "Kế hoạch đã có: be going to."],
      ["f", "", "I think it will rains tomorrow.", ["I think it will rain tomorrow."], "will rain", "After will, use the base verb.", "Sau will dùng động từ nguyên mẫu."],
      ["v", "", "Đợi một chút, tôi sẽ giúp bạn.", ["Wait a moment, I will help you.", "Wait a minute, I will help you.", "Wait a moment. I will help you.", "Just a moment, I will help you.", "Wait a second, I will help you."], "will help", "An offer made now: will.", "Lời đề nghị ngay lúc nói: will."],
      ["f", "", "Are you going to visiting your family this weekend?", ["Are you going to visit your family this weekend?"], "going to visit", "After going to, use the base verb.", "Sau going to dùng động từ nguyên mẫu."],
      ["t", "Make it a question.", "They are going to buy a new car.", ["Are they going to buy a new car?"], "Are they going to buy", "Question: Are + subject + going to.", "Câu hỏi: Are + chủ ngữ + going to."],
      ["v", "", "Tôi sẽ không đi làm muộn nữa (lời hứa).", ["I won't be late for work again.", "I will not be late for work again.", "I won't come to work late again.", "I won't be late for work anymore.", "I won't be late for work any more."], "won't be", "A promise: will not.", "Lời hứa: will not."],
      ["f", "", "We will going to meet the client on Friday.", ["We are going to meet the client on Friday.", "We will meet the client on Friday."], "are going to meet", "Do not mix will and going to.", "Không dùng will và going to cùng lúc."],
      ["t", "Rewrite with: be going to", "I plan to learn English this year.", ["I am going to learn English this year."], "am going to learn", "A plan: am going to + base verb.", "Kế hoạch: am going to + động từ nguyên mẫu."],
      ["v", "", "Bạn sẽ làm gì vào cuối tuần này (dự định)?", ["What are you going to do this weekend?", "What are you going to do at the weekend?", "What are you doing this weekend?"], "are you going to do", "Asking about a plan: be going to.", "Hỏi về dự định: be going to."]
    ],
    free: ["Write 3 to 5 sentences about your plans for next week or next year. Use be going to for plans and will for things you think will happen.", "Viết 3 đến 5 câu về kế hoạch của bạn cho tuần sau hoặc năm sau. Dùng be going to cho kế hoạch và will cho điều bạn nghĩ sẽ xảy ra."]
  });

  add('questions', {
    rule: ["In most questions an auxiliary verb (do, does, did, am, is, are, was, were, will, can, have) comes before the subject. The order is: question word + auxiliary + subject + main verb. After do, does and did, the main verb is the base verb. When who or what is the subject of the verb, do not use do, does or did: Who called you?",
      "Trong hầu hết câu hỏi, trợ động từ (do, does, did, am, is, are, was, were, will, can, have) đứng trước chủ ngữ. Trật tự: từ để hỏi + trợ động từ + chủ ngữ + động từ chính. Sau do, does, did, động từ chính ở dạng nguyên mẫu. Khi who hoặc what là chủ ngữ của động từ thì không dùng do, does, did: Who called you?"],
    forms: ["Question word + do / does / did + subject + base verb?", "Question word + am / is / are / was / were + subject ...?", "Who / What + verb ...? (the question word is the subject)"],
    ex: [["Where do you work?", "Bạn làm việc ở đâu?"], ["What time does the meeting start?", "Cuộc họp bắt đầu lúc mấy giờ?"], ["Why was she late?", "Tại sao cô ấy đến muộn?"], ["Who sent this email?", "Ai đã gửi email này?"]],
    mis: [["Where you work?", "Where do you work?", "The auxiliary do is missing.", "Thiếu trợ động từ do."],
      ["What does she wants?", "What does she want?", "After does, use the base verb.", "Sau does dùng động từ nguyên mẫu."],
      ["Why you are late?", "Why are you late?", "Are comes before the subject.", "Are đứng trước chủ ngữ."]],
    warm: [["Where ___ your manager live?", ["does", "do", "is", "are"], "Your manager = he or she: does.", "Your manager = he hoặc she: does."],
      ["What time ___ you finish work yesterday?", ["did", "do", "were", "does"], "Yesterday: did.", "Yesterday: dùng did."],
      ["Who ___ the door?", ["opened", "did open", "did opened", "does opened"], "Who is the subject: no did.", "Who là chủ ngữ: không dùng did."],
      ["Why ___ they late this morning?", ["were", "did", "was", "do"], "They + be in the past: were.", "They + be ở quá khứ: were."]],
    write: [
      ["f", "", "Where you live?", ["Where do you live?"], "do you live", "The auxiliary do is missing.", "Thiếu trợ động từ do."],
      ["f", "", "What time does the train leaves?", ["What time does the train leave?"], "does the train leave", "After does, use the base verb.", "Sau does dùng động từ nguyên mẫu."],
      ["t", "Write the question that has this answer: in Hanoi", "She works in Hanoi.", ["Where does she work?"], "does she work", "Where + does + subject + base verb.", "Where + does + chủ ngữ + động từ nguyên mẫu."],
      ["v", "", "Bạn bắt đầu làm việc lúc mấy giờ?", ["What time do you start work?", "What time do you start working?", "When do you start work?"], "do you start", "Question word + do + subject + base verb.", "Từ để hỏi + do + chủ ngữ + động từ nguyên mẫu."],
      ["f", "", "Why you didn't call me?", ["Why didn't you call me?", "Why did you not call me?"], "didn't you call", "Didn't comes before the subject.", "Didn't đứng trước chủ ngữ."],
      ["v", "", "Ai đã gửi email này?", ["Who sent this email?"], "Who sent", "Who is the subject: no did.", "Who là chủ ngữ: không dùng did."],
      ["f", "", "How long you have worked here?", ["How long have you worked here?"], "have you worked", "Have comes before the subject.", "Have đứng trước chủ ngữ."],
      ["t", "Make it a yes/no question.", "He can speak Japanese.", ["Can he speak Japanese?"], "Can he speak", "Can comes before the subject.", "Can đứng trước chủ ngữ."],
      ["v", "", "Hôm qua cô ấy đã đi đâu?", ["Where did she go yesterday?"], "did she go", "Where + did + subject + base verb.", "Where + did + chủ ngữ + động từ nguyên mẫu."],
      ["f", "", "Who did call you last night?", ["Who called you last night?"], "Who called", "Who is the subject: no did.", "Who là chủ ngữ: không dùng did."],
      ["t", "Write the question that has this answer: because the bus was late", "They were late because the bus was late.", ["Why were they late?"], "Why were they", "Why + were + subject.", "Why + were + chủ ngữ."],
      ["v", "", "Bạn có bao nhiêu cuộc họp hôm nay?", ["How many meetings do you have today?", "How many meetings have you got today?"], "do you have", "How many + noun + do + subject + base verb.", "How many + danh từ + do + chủ ngữ + động từ nguyên mẫu."]
    ],
    free: ["Write 4 or 5 questions you would ask a new colleague or a new friend about their work, family and free time.", "Viết 4 hoặc 5 câu hỏi bạn muốn hỏi một đồng nghiệp mới hoặc một người bạn mới về công việc, gia đình và thời gian rảnh."]
  });

  add('comparatives', {
    rule: ["To compare two things, use a comparative + than. Short adjectives add -er (cheaper, bigger); long adjectives use more (more expensive). To say one thing is at the top of a group, use the + superlative: short adjectives add -est, long ones use most. Good, bad and far are irregular: better - best, worse - worst, further - furthest. Use as + adjective + as when two things are equal. Never use more and -er together.",
      "Để so sánh hai thứ, dùng dạng so sánh hơn + than. Tính từ ngắn thêm -er (cheaper, bigger); tính từ dài dùng more (more expensive). Để nói một thứ đứng đầu trong nhóm, dùng the + so sánh nhất: tính từ ngắn thêm -est, tính từ dài dùng most. Good, bad, far là bất quy tắc: better - best, worse - worst, further - furthest. Dùng as + tính từ + as khi hai thứ ngang nhau. Không dùng more và -er cùng lúc."],
    forms: ["short adjective + -er + than", "more + long adjective + than", "the + short adjective + -est / the most + long adjective", "as + adjective + as"],
    ex: [["This phone is cheaper than that one.", "Điện thoại này rẻ hơn cái kia."], ["Her job is more interesting than mine.", "Công việc của cô ấy thú vị hơn của tôi."], ["It is the biggest city in Vietnam.", "Đó là thành phố lớn nhất Việt Nam."], ["My English is not as good as yours.", "Tiếng Anh của tôi không tốt bằng của bạn."]],
    mis: [["This is more cheaper.", "This is cheaper.", "Do not use more with -er.", "Không dùng more cùng với -er."],
      ["She is taller that me.", "She is taller than me.", "Use than after a comparative.", "Sau so sánh hơn dùng than."],
      ["It is the most big room.", "It is the biggest room.", "Big is short: biggest.", "Big là tính từ ngắn: biggest."]],
    warm: [["Today is ___ than yesterday.", ["hotter", "more hot", "hottest", "hot"], "Short adjective: hotter.", "Tính từ ngắn: hotter."],
      ["This is the ___ restaurant in town.", ["best", "better", "most good", "goodest"], "Good - better - best.", "Good - better - best."],
      ["The new system is ___ than the old one.", ["more useful", "usefuller", "most useful", "more usefuller"], "Long adjective: more useful.", "Tính từ dài: more useful."],
      ["My desk is as big ___ yours.", ["as", "than", "like", "that"], "as + adjective + as.", "as + tính từ + as."]],
    write: [
      ["f", "", "This laptop is more cheaper than that one.", ["This laptop is cheaper than that one."], "cheaper than", "Do not use more with -er.", "Không dùng more cùng với -er."],
      ["f", "", "She is the most young person in our team.", ["She is the youngest person in our team.", "She is the youngest person on our team."], "the youngest", "Young is short: youngest.", "Young là tính từ ngắn: youngest."],
      ["t", "Compare the two with: expensive", "The red car costs more than the blue car.", ["The red car is more expensive than the blue car.", "The red car is more expensive than the blue one."], "more expensive than", "Long adjective: more + adjective + than.", "Tính từ dài: more + tính từ + than."],
      ["v", "", "Hà Nội lạnh hơn Thành phố Hồ Chí Minh.", ["Hanoi is colder than Ho Chi Minh City."], "colder than", "Short adjective + -er + than.", "Tính từ ngắn + -er + than."],
      ["f", "", "My new job is gooder than my old job.", ["My new job is better than my old job.", "My new job is better than my old one."], "better than", "Good is irregular: better.", "Good là bất quy tắc: better."],
      ["v", "", "Đây là cuộc họp dài nhất trong tuần này.", ["This is the longest meeting this week.", "This is the longest meeting of the week.", "This is the longest meeting of this week."], "the longest", "Superlative: the + -est.", "So sánh nhất: the + -est."],
      ["f", "", "He is taller that his brother.", ["He is taller than his brother."], "taller than", "Use than, not that.", "Dùng than, không phải that."],
      ["t", "Rewrite with: as ... as", "My phone and your phone are equally fast.", ["My phone is as fast as your phone.", "My phone is as fast as yours.", "Your phone is as fast as mine.", "Your phone is as fast as my phone."], "as fast as", "Equal: as + adjective + as.", "Ngang nhau: as + tính từ + as."],
      ["v", "", "Bài kiểm tra này khó hơn bài trước.", ["This test is more difficult than the last one.", "This test is harder than the last one.", "This test is more difficult than the previous one.", "This test is harder than the previous one.", "This test is more difficult than the last test."], "more difficult than", "Long adjective: more difficult than.", "Tính từ dài: more difficult than."],
      ["f", "", "This is the worse day of my week.", ["This is the worst day of my week."], "the worst", "Bad - worse - worst.", "Bad - worse - worst."],
      ["t", "Rewrite with the superlative of: important", "No task is more important than this one.", ["This is the most important task.", "This task is the most important.", "This one is the most important task."], "the most important", "Superlative: the most + long adjective.", "So sánh nhất: the most + tính từ dài."],
      ["v", "", "Tiếng Anh của tôi không tốt bằng của cô ấy.", ["My English is not as good as hers.", "My English isn't as good as her English.", "My English is not so good as hers."], "as good as", "Not equal: not as + adjective + as.", "Không bằng: not as + tính từ + as."]
    ],
    free: ["Write 3 to 5 sentences comparing two jobs, two cities or two phones you know. Use at least one superlative.", "Viết 3 đến 5 câu so sánh hai công việc, hai thành phố hoặc hai chiếc điện thoại bạn biết. Dùng ít nhất một câu so sánh nhất."]
  });

  add('quantifiers', {
    rule: ["Use many with plural countable nouns (many emails) and much with uncountable nouns (much time), mostly in questions and negatives. A lot of works with both and is common in positive sentences. Use some in positive sentences and in offers or requests; use any in negatives and most questions. A few goes with countable nouns, a little with uncountable nouns. Uncountable nouns such as information, advice, money, work and news have no plural form.",
      "Dùng many với danh từ đếm được số nhiều (many emails) và much với danh từ không đếm được (much time), chủ yếu trong câu hỏi và câu phủ định. A lot of dùng được với cả hai và phổ biến trong câu khẳng định. Dùng some trong câu khẳng định và trong lời mời, lời đề nghị; dùng any trong câu phủ định và hầu hết câu hỏi. A few đi với danh từ đếm được, a little đi với danh từ không đếm được. Danh từ không đếm được như information, advice, money, work, news không có dạng số nhiều."],
    forms: ["many / a few + plural countable noun", "much / a little + uncountable noun", "a lot of + plural or uncountable noun", "some (positive) / any (negative, question)"],
    ex: [["I don't have much time today.", "Hôm nay tôi không có nhiều thời gian."], ["How many people are coming?", "Có bao nhiêu người sẽ đến?"], ["We have a lot of work this week.", "Tuần này chúng tôi có rất nhiều việc."], ["Do you have any questions?", "Bạn có câu hỏi nào không?"]],
    mis: [["How much people are there?", "How many people are there?", "People is countable: many.", "People đếm được: dùng many."],
      ["I need some informations.", "I need some information.", "Information has no plural.", "Information không có dạng số nhiều."],
      ["I don't have some money.", "I don't have any money.", "Negative sentences use any.", "Câu phủ định dùng any."]],
    warm: [["How ___ meetings do you have today?", ["many", "much", "any", "a little"], "Meetings is countable.", "Meetings đếm được."],
      ["We don't have ___ time.", ["much", "many", "a few", "some"], "Time is uncountable; negative.", "Time không đếm được; câu phủ định."],
      ["I have ___ questions for you.", ["a few", "a little", "much", "any"], "Questions is countable: a few.", "Questions đếm được: a few."],
      ["Is there ___ coffee left?", ["any", "many", "a few", "much of"], "Questions usually take any.", "Câu hỏi thường dùng any."]],
    write: [
      ["f", "", "How much emails did you get today?", ["How many emails did you get today?"], "How many", "Emails is countable: many.", "Emails đếm được: dùng many."],
      ["f", "", "She gave me some good advices.", ["She gave me some good advice."], "advice", "Advice has no plural.", "Advice không có dạng số nhiều."],
      ["t", "Make it negative.", "I have some money with me.", ["I don't have any money with me."], "any money", "Negative sentences use any.", "Câu phủ định dùng any."],
      ["v", "", "Hôm nay tôi không có nhiều thời gian.", ["I don't have much time today.", "I don't have a lot of time today.", "Today I don't have much time.", "I haven't got much time today."], "much time", "Time is uncountable: much.", "Time không đếm được: much."],
      ["f", "", "There aren't much people in the office today.", ["There aren't many people in the office today."], "many people", "People is countable: many.", "People đếm được: dùng many."],
      ["v", "", "Bạn có câu hỏi nào không?", ["Do you have any questions?", "Have you got any questions?"], "any questions", "Questions take any.", "Câu hỏi dùng any."],
      ["f", "", "I have a little friends in this city.", ["I have a few friends in this city."], "a few friends", "Friends is countable: a few.", "Friends đếm được: a few."],
      ["t", "Make it a question with: How much", "This phone costs five million dong.", ["How much does this phone cost?", "How much is this phone?"], "How much", "Price: how much.", "Hỏi giá: how much."],
      ["v", "", "Tuần này chúng tôi có rất nhiều việc.", ["We have a lot of work this week.", "This week we have a lot of work.", "We have lots of work this week.", "We have got a lot of work this week."], "a lot of work", "Work is uncountable: no plural.", "Work không đếm được: không có số nhiều."],
      ["f", "", "Can I have any water, please?", ["Can I have some water, please?"], "some water", "Requests use some.", "Lời đề nghị dùng some."],
      ["t", "Rewrite with: a little", "I speak some English, but not much.", ["I speak a little English."], "a little English", "English is uncountable: a little.", "English không đếm được: a little."],
      ["v", "", "Có bao nhiêu người trong nhóm của bạn?", ["How many people are there in your team?", "How many people are in your team?", "How many people are there on your team?", "How many people are on your team?"], "How many people", "People is countable: how many.", "People đếm được: how many."]
    ],
    free: ["Write 3 to 5 sentences about what you have and do not have at work or at home: time, money, friends, meetings, emails.", "Viết 3 đến 5 câu về những thứ bạn có và không có ở nơi làm việc hoặc ở nhà: thời gian, tiền, bạn bè, cuộc họp, email."]
  });

  add('modals-advice', {
    rule: ["Use should to give advice. Use must when the speaker feels something is necessary, and have to when a rule or another person makes it necessary. Mustn't means it is not allowed. Don't have to means it is not necessary: you can choose. After should and must, use the base verb without to. Have to changes with the subject and the tense: has to, had to.",
      "Dùng should để khuyên. Dùng must khi người nói thấy việc đó là cần thiết, và have to khi quy định hoặc người khác bắt buộc. Mustn't nghĩa là không được phép. Don't have to nghĩa là không cần thiết: bạn có thể chọn. Sau should và must dùng động từ nguyên mẫu không có to. Have to thay đổi theo chủ ngữ và thì: has to, had to."],
    forms: ["Subject + should / shouldn't + base verb", "Subject + must / mustn't + base verb", "Subject + have to / has to + base verb", "Subject + don't / doesn't have to + base verb"],
    ex: [["You should talk to your manager.", "Bạn nên nói chuyện với quản lý."], ["I must finish this report today.", "Tôi phải hoàn thành báo cáo này hôm nay."], ["She has to wear a uniform at work.", "Cô ấy phải mặc đồng phục khi đi làm."], ["You don't have to come tomorrow.", "Ngày mai bạn không cần đến."]],
    mis: [["You should to rest.", "You should rest.", "No to after should.", "Sau should không có to."],
      ["She must works late.", "She must work late.", "After must, use the base verb.", "Sau must dùng động từ nguyên mẫu."],
      ["He have to go now.", "He has to go now.", "He takes has to.", "He đi với has to."]],
    warm: [["You look tired. You ___ go home.", ["should", "should to", "must to", "have"], "Advice: should + base verb.", "Lời khuyên: should + động từ nguyên mẫu."],
      ["It's Sunday. I ___ get up early.", ["don't have to", "mustn't", "shouldn't to", "haven't to"], "Not necessary: don't have to.", "Không cần thiết: don't have to."],
      ["You ___ smoke in the office. It is not allowed.", ["mustn't", "don't have to", "should", "haven't"], "Not allowed: mustn't.", "Không được phép: mustn't."],
      ["My sister ___ work on Saturdays.", ["has to", "have to", "must to", "should to"], "My sister = she: has to.", "My sister = she: has to."]],
    write: [
      ["f", "", "You should to call the client today.", ["You should call the client today."], "should call", "No to after should.", "Sau should không có to."],
      ["f", "", "She have to finish the report by Friday.", ["She has to finish the report by Friday."], "has to finish", "She takes has to.", "She đi với has to."],
      ["t", "Give advice with: should", "It is a good idea for you to sleep more.", ["You should sleep more."], "should sleep", "Advice: should + base verb.", "Lời khuyên: should + động từ nguyên mẫu."],
      ["v", "", "Ngày mai bạn không cần đến văn phòng.", ["You don't have to come to the office tomorrow.", "You don't need to come to the office tomorrow.", "Tomorrow you don't have to come to the office.", "You don't have to go to the office tomorrow."], "don't have to come", "Not necessary: don't have to.", "Không cần thiết: don't have to."],
      ["f", "", "We must to wear a helmet here.", ["We must wear a helmet here."], "must wear", "No to after must.", "Sau must không có to."],
      ["v", "", "Bạn không được dùng điện thoại trong cuộc họp.", ["You mustn't use your phone in the meeting.", "You must not use your phone in the meeting.", "You mustn't use your phone during the meeting.", "You mustn't use the phone in the meeting.", "You can't use your phone in the meeting."], "mustn't use", "Not allowed: mustn't.", "Không được phép: mustn't."],
      ["f", "", "He don't have to work tomorrow.", ["He doesn't have to work tomorrow."], "doesn't have to", "He takes doesn't.", "He đi với doesn't."],
      ["t", "Rewrite in the past with: yesterday", "I have to work late.", ["I had to work late yesterday.", "Yesterday I had to work late.", "Yesterday, I had to work late."], "had to work", "Past of have to: had to.", "Quá khứ của have to: had to."],
      ["v", "", "Bạn nên học tiếng Anh mỗi ngày.", ["You should study English every day.", "You should learn English every day."], "should study", "Advice: should + base verb.", "Lời khuyên: should + động từ nguyên mẫu."],
      ["f", "", "You shouldn't working so much.", ["You shouldn't work so much."], "shouldn't work", "After shouldn't, use the base verb.", "Sau shouldn't dùng động từ nguyên mẫu."],
      ["t", "Make it a question.", "She has to travel a lot.", ["Does she have to travel a lot?"], "Does she have to", "Question: Does + subject + have to.", "Câu hỏi: Does + chủ ngữ + have to."],
      ["v", "", "Tôi phải hoàn thành báo cáo này trước 5 giờ.", ["I have to finish this report before 5.", "I must finish this report before 5.", "I have to finish this report by 5.", "I must finish this report by 5.", "I have to finish this report before five."], "have to finish", "Necessary: have to or must.", "Bắt buộc: have to hoặc must."]
    ],
    free: ["Write 3 to 5 sentences with advice and rules for a new person in your company: what they should, must and don't have to do.", "Viết 3 đến 5 câu gồm lời khuyên và quy định cho người mới vào công ty bạn: họ nên làm gì, phải làm gì và không cần làm gì."]
  });

  return { VERSION: VERSION, add: add, has: has, ids: ids, get: get };
})();
