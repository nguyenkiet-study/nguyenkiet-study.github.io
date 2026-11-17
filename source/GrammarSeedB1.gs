/**
 * GrammarSeedB1.gs
 * Hand-written grammar lessons for the B1 topics. See GrammarSeed.gs for the short form.
 */
(function () {
  var add = GrammarSeed.add;

  add('present-perfect', {
    rule: ["Use the present perfect (have or has + past participle) for a past action with a result now, for life experience without saying when, and for something that started in the past and still continues, often with for (a period) or since (a starting point). It is common with just, already, yet, ever and never. Do not use it with a finished time such as yesterday, last week or in 2020: use the past simple there.",
      "Dùng thì hiện tại hoàn thành (have hoặc has + quá khứ phân từ) cho hành động trong quá khứ có kết quả ở hiện tại, cho trải nghiệm mà không nói rõ khi nào, và cho việc bắt đầu trong quá khứ và vẫn tiếp tục, thường đi với for (khoảng thời gian) hoặc since (mốc bắt đầu). Thì này hay đi với just, already, yet, ever, never. Không dùng với thời gian đã kết thúc như yesterday, last week, in 2020: khi đó dùng quá khứ đơn."],
    forms: ["Subject + have / has + past participle", "Subject + haven't / hasn't + past participle", "Have / Has + subject + past participle?", "for + period (for five years) / since + starting point (since 2020)"],
    ex: [["I have worked here for five years.", "Tôi đã làm việc ở đây được năm năm."], ["She has just sent the email.", "Cô ấy vừa gửi email xong."], ["Have you ever been to Japan?", "Bạn đã bao giờ đến Nhật chưa?"], ["We haven't finished the report yet.", "Chúng tôi vẫn chưa hoàn thành báo cáo."]],
    mis: [["I have seen him yesterday.", "I saw him yesterday.", "Yesterday is a finished time: past simple.", "Yesterday là thời gian đã kết thúc: dùng quá khứ đơn."],
      ["She has work here since 2020.", "She has worked here since 2020.", "After has, use the past participle.", "Sau has dùng quá khứ phân từ."],
      ["I live here for ten years.", "I have lived here for ten years.", "Started in the past and still true: present perfect.", "Bắt đầu trong quá khứ và vẫn đúng: hiện tại hoàn thành."]],
    warm: [["I ___ in this company since 2021.", ["have worked", "work", "am working", "worked since"], "Since 2021 until now: present perfect.", "Từ 2021 đến nay: hiện tại hoàn thành."],
      ["She has ___ finished the report.", ["already", "yet", "ever", "since"], "Already goes in positive sentences.", "Already dùng trong câu khẳng định."],
      ["We ___ the client last Friday.", ["met", "have met", "has met", "have meet"], "Last Friday is finished: past simple.", "Last Friday đã kết thúc: quá khứ đơn."],
      ["Have you ___ eaten sushi?", ["ever", "yet", "since", "for"], "Experience questions use ever.", "Câu hỏi về trải nghiệm dùng ever."]],
    write: [
      ["f", "", "I have sent the report yesterday.", ["I sent the report yesterday."], "sent", "Yesterday is a finished time: past simple.", "Yesterday là thời gian đã kết thúc: dùng quá khứ đơn."],
      ["f", "", "She has work here for three years.", ["She has worked here for three years."], "has worked", "After has, use the past participle.", "Sau has dùng quá khứ phân từ."],
      ["t", "Join the two sentences with: for", "I started this job five years ago. I still do it.", ["I have done this job for five years.", "I have had this job for five years.", "I have worked in this job for five years.", "I have been in this job for five years."], "have done", "Started in the past, still true: have + past participle + for.", "Bắt đầu trong quá khứ, vẫn đúng: have + quá khứ phân từ + for."],
      ["v", "", "Tôi đã làm việc ở đây được năm năm.", ["I have worked here for five years.", "I have been working here for five years."], "have worked", "Still true now: present perfect + for.", "Vẫn đúng ở hiện tại: hiện tại hoàn thành + for."],
      ["f", "", "I live in this city since 2015.", ["I have lived in this city since 2015."], "have lived", "Since + a starting point needs the present perfect.", "Since + mốc bắt đầu cần hiện tại hoàn thành."],
      ["v", "", "Bạn đã bao giờ đến Singapore chưa?", ["Have you ever been to Singapore?", "Have you ever visited Singapore?"], "Have you ever been", "Experience: Have you ever + past participle.", "Trải nghiệm: Have you ever + quá khứ phân từ."],
      ["f", "", "He didn't finish the report yet.", ["He hasn't finished the report yet."], "hasn't finished", "Yet goes with the present perfect.", "Yet đi với hiện tại hoàn thành."],
      ["t", "Make it negative with: yet", "They have answered my email.", ["They haven't answered my email yet."], "haven't answered", "Negative + yet at the end.", "Phủ định + yet ở cuối câu."],
      ["v", "", "Cô ấy vừa gửi email cho khách hàng.", ["She has just sent an email to the client.", "She has just sent the client an email.", "She has just emailed the client.", "She has just sent the email to the client."], "has just sent", "Just goes between has and the participle.", "Just đứng giữa has và quá khứ phân từ."],
      ["f", "", "Have you ever went to Da Lat?", ["Have you ever been to Da Lat?", "Have you ever gone to Da Lat?"], "been", "After have, use the past participle.", "Sau have dùng quá khứ phân từ."],
      ["t", "Rewrite with: since", "I met her in 2019. I still know her.", ["I have known her since 2019."], "have known", "Since + starting point: present perfect.", "Since + mốc bắt đầu: hiện tại hoàn thành."],
      ["v", "", "Chúng tôi chưa nhận được câu trả lời.", ["We haven't received a reply yet.", "We haven't received an answer yet.", "We haven't got a reply yet.", "We haven't received a response yet.", "We haven't had a reply yet."], "haven't received", "Not up to now: haven't + past participle + yet.", "Chưa cho đến nay: haven't + quá khứ phân từ + yet."]
    ],
    free: ["Write 3 to 5 sentences about your work and life experience: how long you have done things, and things you have or have never done.", "Viết 3 đến 5 câu về kinh nghiệm làm việc và trải nghiệm sống của bạn: bạn đã làm việc gì được bao lâu, những việc bạn đã từng hoặc chưa từng làm."]
  });

  add('past-continuous', {
    rule: ["Use the past continuous (was or were + verb-ing) for an action that was in progress at a time in the past. It often gives the background for a shorter action in the past simple: I was cooking when the phone rang. Use while before the longer action and when before the shorter one. Do not use it for finished single actions or with state verbs such as know and want.",
      "Dùng thì quá khứ tiếp diễn (was hoặc were + động từ thêm -ing) cho hành động đang diễn ra tại một thời điểm trong quá khứ. Thì này thường làm nền cho một hành động ngắn hơn ở quá khứ đơn: I was cooking when the phone rang. Dùng while trước hành động dài và when trước hành động ngắn. Không dùng cho hành động đơn lẻ đã xong hoặc với động từ chỉ trạng thái như know, want."],
    forms: ["Subject + was / were + verb-ing", "Subject + wasn't / weren't + verb-ing", "Was / Were + subject + verb-ing?", "Past continuous + when + past simple / While + past continuous, past simple"],
    ex: [["I was working at 8 pm last night.", "Tối qua lúc 8 giờ tôi đang làm việc."], ["She was driving when I called her.", "Cô ấy đang lái xe khi tôi gọi."], ["What were you doing yesterday afternoon?", "Chiều qua bạn đang làm gì?"], ["While we were talking, the manager came in.", "Trong khi chúng tôi đang nói chuyện thì quản lý bước vào."]],
    mis: [["I was work when you called.", "I was working when you called.", "After was, the verb needs -ing.", "Sau was, động từ phải thêm -ing."],
      ["They was waiting outside.", "They were waiting outside.", "They takes were.", "They đi với were."],
      ["When I was arriving, the meeting started.", "When I arrived, the meeting started.", "A short finished action: past simple.", "Hành động ngắn đã xong: quá khứ đơn."]],
    warm: [["I ___ dinner when the phone rang.", ["was cooking", "cooked", "am cooking", "was cook"], "In progress when something happened.", "Đang diễn ra khi việc khác xảy ra."],
      ["What ___ you doing at 9 last night?", ["were", "was", "did", "are"], "You takes were.", "You đi với were."],
      ["While she ___ the report, the computer stopped.", ["was writing", "wrote", "writes", "is writing"], "While + the longer action.", "While + hành động dài hơn."],
      ["He was driving when he ___ the accident.", ["saw", "was seeing", "sees", "seen"], "The short action: past simple.", "Hành động ngắn: quá khứ đơn."]],
    write: [
      ["f", "", "I was write an email when she came in.", ["I was writing an email when she came in."], "was writing", "After was, the verb needs -ing.", "Sau was, động từ phải thêm -ing."],
      ["f", "", "We was having lunch at twelve o'clock.", ["We were having lunch at twelve o'clock."], "were having", "We takes were.", "We đi với were."],
      ["t", "Join the two sentences with: when", "I was walking home. It started to rain.", ["I was walking home when it started to rain.", "When it started to rain, I was walking home."], "was walking", "Background action + when + short action.", "Hành động nền + when + hành động ngắn."],
      ["v", "", "Tối qua lúc 8 giờ tôi đang xem phim.", ["I was watching a film at 8 last night.", "I was watching a movie at 8 last night.", "At 8 last night I was watching a film.", "At 8 last night I was watching a movie.", "I was watching a movie at 8 pm last night."], "was watching", "In progress at a past time.", "Đang diễn ra tại một thời điểm quá khứ."],
      ["f", "", "She was driving when she was seeing the accident.", ["She was driving when she saw the accident."], "saw", "The short action: past simple.", "Hành động ngắn: quá khứ đơn."],
      ["v", "", "Bạn đang làm gì khi tôi gọi?", ["What were you doing when I called?", "What were you doing when I called you?", "What were you doing when I phoned?", "What were you doing when I rang?"], "were you doing", "Question: were + subject + verb-ing.", "Câu hỏi: were + chủ ngữ + động từ thêm -ing."],
      ["f", "", "What was you doing at ten o'clock last night?", ["What were you doing at ten o'clock last night?"], "were you doing", "You takes were.", "You đi với were."],
      ["t", "Make it negative.", "He was listening to the teacher.", ["He wasn't listening to the teacher."], "wasn't listening", "Negative: was not + verb-ing.", "Phủ định: was not + động từ thêm -ing."],
      ["v", "", "Trong khi chúng tôi đang họp thì mất điện.", ["While we were having a meeting, the power went out.", "The power went out while we were having a meeting.", "While we were in a meeting, the power went out.", "While we were having a meeting, the electricity went off.", "The power went off while we were having a meeting."], "were having", "While + past continuous, past simple.", "While + quá khứ tiếp diễn, quá khứ đơn."],
      ["f", "", "I was knowing the answer, but I said nothing.", ["I knew the answer, but I said nothing."], "knew", "Know is a state verb: past simple.", "Know là động từ chỉ trạng thái: quá khứ đơn."],
      ["t", "Make it a question.", "They were waiting for the bus.", ["Were they waiting for the bus?"], "Were they waiting", "Question: Were + subject + verb-ing.", "Câu hỏi: Were + chủ ngữ + động từ thêm -ing."],
      ["v", "", "Lúc tôi đến, cô ấy đang nói chuyện điện thoại.", ["When I arrived, she was talking on the phone.", "She was talking on the phone when I arrived.", "When I came, she was talking on the phone.", "She was talking on the phone when I came.", "When I got there, she was talking on the phone."], "was talking", "In progress when I arrived.", "Đang diễn ra khi tôi đến."]
    ],
    free: ["Write 3 to 5 sentences about a moment when something surprising happened: what you were doing, and what happened.", "Viết 3 đến 5 câu về một lúc có chuyện bất ngờ xảy ra: khi đó bạn đang làm gì, và chuyện gì đã xảy ra."]
  });

  add('conditionals-1-2', {
    rule: ["The first conditional talks about a real possibility in the future: If + present simple, will + base verb. The second conditional talks about something unreal or unlikely now or in the future: If + past simple, would + base verb. Do not put will or would in the if part. In the second conditional, If I were you is the usual form for advice. When the if part comes first, put a comma after it.",
      "Câu điều kiện loại 1 nói về khả năng có thật trong tương lai: If + hiện tại đơn, will + động từ nguyên mẫu. Câu điều kiện loại 2 nói về điều không có thật hoặc khó xảy ra ở hiện tại hay tương lai: If + quá khứ đơn, would + động từ nguyên mẫu. Không dùng will hoặc would trong mệnh đề if. Ở loại 2, If I were you là dạng thường dùng để khuyên. Khi mệnh đề if đứng trước thì có dấu phẩy sau nó."],
    forms: ["If + present simple, subject + will + base verb", "If + past simple, subject + would + base verb", "If I were you, I would + base verb"],
    ex: [["If it rains, we will stay at home.", "Nếu trời mưa, chúng tôi sẽ ở nhà."], ["If you send it today, she will get it tomorrow.", "Nếu bạn gửi hôm nay, ngày mai cô ấy sẽ nhận được."], ["If I had more time, I would learn Japanese.", "Nếu tôi có nhiều thời gian hơn, tôi sẽ học tiếng Nhật."], ["If I were you, I would talk to the manager.", "Nếu tôi là bạn, tôi sẽ nói chuyện với quản lý."]],
    mis: [["If it will rain, we will stay home.", "If it rains, we will stay home.", "No will in the if part.", "Không dùng will trong mệnh đề if."],
      ["If I would have money, I would buy it.", "If I had money, I would buy it.", "No would in the if part.", "Không dùng would trong mệnh đề if."],
      ["If I have a car, I would drive to work.", "If I had a car, I would drive to work.", "Unreal now: if + past simple.", "Không có thật ở hiện tại: if + quá khứ đơn."]],
    warm: [["If she ___ late, we will start without her.", ["is", "will be", "would be", "were"], "Real future: if + present simple.", "Tương lai có thật: if + hiện tại đơn."],
      ["If I ___ rich, I would travel the world.", ["were", "am", "will be", "would be"], "Unreal now: if + past simple.", "Không có thật: if + quá khứ đơn."],
      ["If you study every day, you ___ quickly.", ["will improve", "would improve", "improved", "improving"], "First conditional: will + base verb.", "Loại 1: will + động từ nguyên mẫu."],
      ["If I had more time, I ___ more books.", ["would read", "will read", "read", "had read"], "Second conditional: would + base verb.", "Loại 2: would + động từ nguyên mẫu."]],
    write: [
      ["f", "", "If it will rain tomorrow, we will cancel the trip.", ["If it rains tomorrow, we will cancel the trip."], "If it rains", "No will in the if part.", "Không dùng will trong mệnh đề if."],
      ["f", "", "If I would have more time, I would learn French.", ["If I had more time, I would learn French."], "If I had", "No would in the if part.", "Không dùng would trong mệnh đề if."],
      ["t", "Join the two sentences with: if (a real possibility)", "Maybe you will be late. Then the manager will be angry.", ["If you are late, the manager will be angry.", "The manager will be angry if you are late."], "If you are late", "If + present simple, will + base verb.", "If + hiện tại đơn, will + động từ nguyên mẫu."],
      ["v", "", "Nếu ngày mai trời mưa, tôi sẽ ở nhà.", ["If it rains tomorrow, I will stay at home.", "If it rains tomorrow, I will stay home.", "I will stay at home if it rains tomorrow.", "I will stay home if it rains tomorrow."], "If it rains", "Real future: if + present simple.", "Tương lai có thật: if + hiện tại đơn."],
      ["f", "", "If I am you, I would accept the job.", ["If I were you, I would accept the job."], "If I were you", "Advice: If I were you.", "Lời khuyên: If I were you."],
      ["v", "", "Nếu tôi có nhiều tiền, tôi sẽ mua một căn nhà lớn (không có thật).", ["If I had a lot of money, I would buy a big house.", "I would buy a big house if I had a lot of money.", "If I had lots of money, I would buy a big house.", "If I had much money, I would buy a big house."], "If I had", "Unreal now: if + past simple, would.", "Không có thật: if + quá khứ đơn, would."],
      ["f", "", "If she studies harder, she would pass the exam.", ["If she studies harder, she will pass the exam.", "If she studied harder, she would pass the exam."], "will pass", "Do not mix the two types.", "Không trộn hai loại với nhau."],
      ["t", "Rewrite as a second conditional.", "I don't have a car, so I don't drive to work.", ["If I had a car, I would drive to work.", "I would drive to work if I had a car."], "If I had", "Unreal now: if + past simple, would + base verb.", "Không có thật: if + quá khứ đơn, would + động từ nguyên mẫu."],
      ["v", "", "Nếu bạn gửi email hôm nay, ngày mai họ sẽ trả lời.", ["If you send the email today, they will reply tomorrow.", "If you send the email today, they will answer tomorrow.", "They will reply tomorrow if you send the email today.", "If you email them today, they will reply tomorrow.", "If you send an email today, they will reply tomorrow."], "If you send", "Real future: if + present simple, will.", "Tương lai có thật: if + hiện tại đơn, will."],
      ["f", "", "We will be late if we will not leave now.", ["We will be late if we do not leave now."], "if we do not leave", "No will in the if part.", "Không dùng will trong mệnh đề if."],
      ["t", "Give advice with: If I were you", "You should talk to your manager.", ["If I were you, I would talk to your manager.", "If I were you, I would talk to my manager.", "If I were you, I would talk to the manager."], "If I were you", "If I were you, I would + base verb.", "If I were you, I would + động từ nguyên mẫu."],
      ["v", "", "Nếu tôi là bạn, tôi sẽ không nghỉ việc.", ["If I were you, I wouldn't quit the job.", "If I were you, I wouldn't quit.", "If I were you, I wouldn't leave the job.", "If I were you, I wouldn't quit my job.", "If I were you, I wouldn't resign."], "If I were you", "Advice: If I were you, I wouldn't.", "Lời khuyên: If I were you, I wouldn't."]
    ],
    free: ["Write 3 to 5 sentences: two about what you will do if something happens this week, and two about what you would do if your life were different.", "Viết 3 đến 5 câu: hai câu về việc bạn sẽ làm nếu có chuyện gì đó xảy ra trong tuần này, và hai câu về việc bạn sẽ làm nếu cuộc sống của bạn khác đi."]
  });

  add('passive', {
    rule: ["Use the passive when the action or the thing it happens to matters more than who does it, or when we do not know who does it. Form it with the verb be in the right tense + past participle. The object of the active sentence becomes the subject. Add by + person only when it is important to say who did it.",
      "Dùng câu bị động khi hành động hoặc đối tượng chịu tác động quan trọng hơn người thực hiện, hoặc khi không biết ai thực hiện. Cấu tạo: động từ be ở đúng thì + quá khứ phân từ. Tân ngữ của câu chủ động trở thành chủ ngữ. Chỉ thêm by + người thực hiện khi cần nói rõ ai làm."],
    forms: ["Present: am / is / are + past participle", "Past: was / were + past participle", "Future and modals: will be / can be / must be + past participle", "Present perfect: has / have been + past participle"],
    ex: [["The report is sent every Monday.", "Báo cáo được gửi vào mỗi thứ Hai."], ["This office was built in 2010.", "Văn phòng này được xây năm 2010."], ["The meeting will be held online.", "Cuộc họp sẽ được tổ chức trực tuyến."], ["The email has been sent.", "Email đã được gửi."]],
    mis: [["The report sent yesterday.", "The report was sent yesterday.", "The verb be is missing.", "Thiếu động từ be."],
      ["The room is clean every day.", "The room is cleaned every day.", "Use the past participle after be.", "Sau be dùng quá khứ phân từ."],
      ["The letter was wrote by her.", "The letter was written by her.", "Write - wrote - written.", "Write - wrote - written."]],
    warm: [["This car ___ in Japan.", ["was made", "made", "is make", "was make"], "Passive: was + past participle.", "Bị động: was + quá khứ phân từ."],
      ["English ___ in many countries.", ["is spoken", "speaks", "is speaking", "spoke"], "Passive present: is + past participle.", "Bị động hiện tại: is + quá khứ phân từ."],
      ["The results will ___ next week.", ["be announced", "announce", "announced", "be announce"], "Future passive: will be + past participle.", "Bị động tương lai: will be + quá khứ phân từ."],
      ["The documents ___ already been signed.", ["have", "are", "was", "be"], "Documents is plural: have been.", "Documents là số nhiều: have been."]],
    write: [
      ["f", "", "The email sent to the client yesterday.", ["The email was sent to the client yesterday."], "was sent", "The verb be is missing.", "Thiếu động từ be."],
      ["f", "", "This room is clean every morning.", ["This room is cleaned every morning."], "is cleaned", "Use the past participle after be.", "Sau be dùng quá khứ phân từ."],
      ["t", "Rewrite in the passive. Do not say who.", "Someone stole my bike last night.", ["My bike was stolen last night."], "was stolen", "Past passive: was + past participle.", "Bị động quá khứ: was + quá khứ phân từ."],
      ["v", "", "Văn phòng này được xây năm 2015.", ["This office was built in 2015."], "was built", "Past passive: was + past participle.", "Bị động quá khứ: was + quá khứ phân từ."],
      ["f", "", "The contract was wrote by our lawyer.", ["The contract was written by our lawyer."], "was written", "Write - wrote - written.", "Write - wrote - written."],
      ["v", "", "Cuộc họp sẽ được tổ chức vào thứ Sáu.", ["The meeting will be held on Friday.", "The meeting is going to be held on Friday.", "The meeting will be organised on Friday.", "The meeting will be organized on Friday."], "will be held", "Future passive: will be + past participle.", "Bị động tương lai: will be + quá khứ phân từ."],
      ["f", "", "The new products will launch next month by the company.", ["The new products will be launched next month by the company.", "The new products will be launched by the company next month.", "The new products will be launched next month."], "will be launched", "Future passive: will be + past participle.", "Bị động tương lai: will be + quá khứ phân từ."],
      ["t", "Rewrite in the passive with: by", "The manager checks every report.", ["Every report is checked by the manager."], "is checked by", "Present passive: is + past participle + by.", "Bị động hiện tại: is + quá khứ phân từ + by."],
      ["v", "", "Email đã được gửi rồi.", ["The email has been sent.", "The email has already been sent.", "The email was sent.", "The email has been sent already."], "has been sent", "Present perfect passive: has been + past participle.", "Bị động hiện tại hoàn thành: has been + quá khứ phân từ."],
      ["f", "", "Many people was invited to the party.", ["Many people were invited to the party."], "were invited", "People is plural: were.", "People là số nhiều: were."],
      ["t", "Rewrite in the passive. Do not say who.", "You must finish the work today.", ["The work must be finished today."], "must be finished", "Modal passive: must be + past participle.", "Bị động với modal: must be + quá khứ phân từ."],
      ["v", "", "Tiếng Anh được sử dụng trong tất cả các cuộc họp của chúng tôi.", ["English is used in all our meetings.", "English is used in all of our meetings.", "English is spoken in all our meetings.", "English is spoken in all of our meetings."], "is used", "Present passive: is + past participle.", "Bị động hiện tại: is + quá khứ phân từ."]
    ],
    free: ["Write 3 to 5 sentences about how something is done at your company or in your city: what is made, sent, checked or held, and when.", "Viết 3 đến 5 câu về cách một việc được thực hiện ở công ty hoặc thành phố của bạn: cái gì được làm ra, được gửi, được kiểm tra hoặc được tổ chức, và khi nào."]
  });

  add('relative-clauses', {
    rule: ["A relative clause gives more information about a noun. Use who for people, which for things, that for people or things, where for places and whose for possession. The relative word replaces he, she, it or they, so do not repeat the pronoun. When the relative word is the object of the clause, you can leave it out: the book (that) I bought.",
      "Mệnh đề quan hệ bổ sung thông tin cho một danh từ. Dùng who cho người, which cho vật, that cho người hoặc vật, where cho nơi chốn và whose cho sở hữu. Từ quan hệ thay cho he, she, it, they nên không lặp lại đại từ. Khi từ quan hệ là tân ngữ của mệnh đề thì có thể lược bỏ: the book (that) I bought."],
    forms: ["person + who / that + verb", "thing + which / that + verb", "place + where + subject + verb", "noun + whose + noun"],
    ex: [["The woman who called you is my manager.", "Người phụ nữ đã gọi cho bạn là quản lý của tôi."], ["This is the report that I wrote last week.", "Đây là báo cáo tôi đã viết tuần trước."], ["That is the office where I work.", "Đó là văn phòng nơi tôi làm việc."], ["I have a friend whose father is a doctor.", "Tôi có một người bạn có bố là bác sĩ."]],
    mis: [["The man which called is my boss.", "The man who called is my boss.", "Use who for people.", "Dùng who cho người."],
      ["This is the book that I bought it.", "This is the book that I bought.", "Do not repeat the object pronoun.", "Không lặp lại đại từ tân ngữ."],
      ["The woman who she lives here is a teacher.", "The woman who lives here is a teacher.", "Who replaces she.", "Who đã thay cho she."]],
    warm: [["The colleague ___ sits next to me is from Hue.", ["who", "which", "where", "whose"], "A person: who.", "Chỉ người: who."],
      ["This is the laptop ___ I use at work.", ["that", "who", "where", "whose"], "A thing: that or which.", "Chỉ vật: that hoặc which."],
      ["That is the restaurant ___ we had lunch.", ["where", "which", "who", "that it"], "A place where something happens: where.", "Nơi diễn ra việc gì đó: where."],
      ["She is the manager ___ team won the prize.", ["whose", "who", "which", "that"], "Possession: whose.", "Sở hữu: whose."]],
    write: [
      ["f", "", "The man which interviewed me was very kind.", ["The man who interviewed me was very kind.", "The man that interviewed me was very kind."], "who interviewed", "Use who for people.", "Dùng who cho người."],
      ["f", "", "This is the phone that I bought it last week.", ["This is the phone that I bought last week.", "This is the phone which I bought last week.", "This is the phone I bought last week."], "that I bought", "Do not repeat the object pronoun.", "Không lặp lại đại từ tân ngữ."],
      ["t", "Join the two sentences with: who", "I have a colleague. She speaks four languages.", ["I have a colleague who speaks four languages."], "who speaks", "Who replaces she.", "Who thay cho she."],
      ["v", "", "Đây là công ty nơi tôi đã làm việc năm năm.", ["This is the company where I worked for five years.", "This is the company where I have worked for five years."], "where I worked", "A place: where + subject + verb.", "Nơi chốn: where + chủ ngữ + động từ."],
      ["f", "", "The woman who she called you is my sister.", ["The woman who called you is my sister.", "The woman that called you is my sister."], "who called", "Who replaces she.", "Who đã thay cho she."],
      ["v", "", "Người đàn ông đang nói chuyện với quản lý là khách hàng của chúng tôi.", ["The man who is talking to the manager is our client.", "The man who is talking to the manager is our customer.", "The man talking to the manager is our client.", "The man that is talking to the manager is our client.", "The man who is talking with the manager is our client."], "who is talking", "A person: who + verb.", "Chỉ người: who + động từ."],
      ["f", "", "That is the city which I was born.", ["That is the city where I was born.", "That is the city in which I was born.", "That is the city which I was born in."], "where I was born", "A place where something happens: where.", "Nơi diễn ra việc gì đó: where."],
      ["t", "Join the two sentences with: that", "I read the report. You sent it yesterday.", ["I read the report that you sent yesterday.", "I read the report which you sent yesterday.", "I read the report you sent yesterday."], "that you sent", "That replaces it.", "That thay cho it."],
      ["v", "", "Tôi có một người bạn có anh trai làm việc ở Nhật.", ["I have a friend whose brother works in Japan."], "whose brother", "Possession: whose + noun.", "Sở hữu: whose + danh từ."],
      ["f", "", "The people who works here are very friendly.", ["The people who work here are very friendly.", "The people that work here are very friendly."], "who work", "People is plural: work.", "People là số nhiều: work."],
      ["t", "Join the two sentences with: where", "This is the room. We have our meetings here.", ["This is the room where we have our meetings."], "where we have", "Where replaces here.", "Where thay cho here."],
      ["v", "", "Cuốn sách tôi đang đọc rất thú vị.", ["The book that I am reading is very interesting.", "The book I am reading is very interesting.", "The book which I am reading is very interesting."], "that I am reading", "A thing: that or which (or nothing).", "Chỉ vật: that hoặc which (hoặc lược bỏ)."]
    ],
    free: ["Write 3 to 5 sentences that describe people, places and things in your life using who, which, that, where or whose.", "Viết 3 đến 5 câu mô tả người, nơi chốn và đồ vật trong cuộc sống của bạn, dùng who, which, that, where hoặc whose."]
  });

  add('gerund-infinitive', {
    rule: ["Some verbs are followed by verb-ing: enjoy, finish, avoid, mind, suggest, keep, consider. Some are followed by to + verb: want, need, decide, hope, plan, agree, promise, would like. After a preposition (in, at, of, about, for, before, after), always use verb-ing. Like, love, hate and start can take both forms.",
      "Một số động từ đi với động từ thêm -ing: enjoy, finish, avoid, mind, suggest, keep, consider. Một số đi với to + động từ: want, need, decide, hope, plan, agree, promise, would like. Sau giới từ (in, at, of, about, for, before, after) luôn dùng động từ thêm -ing. Like, love, hate và start dùng được cả hai dạng."],
    forms: ["enjoy / finish / avoid / mind / suggest + verb-ing", "want / need / decide / hope / plan + to + base verb", "preposition + verb-ing"],
    ex: [["I enjoy working with my team.", "Tôi thích làm việc với nhóm của mình."], ["She decided to change her job.", "Cô ấy đã quyết định đổi việc."], ["He is good at solving problems.", "Anh ấy giỏi giải quyết vấn đề."], ["We finished writing the report.", "Chúng tôi đã viết xong báo cáo."]],
    mis: [["I enjoy to read.", "I enjoy reading.", "Enjoy + verb-ing.", "Enjoy + động từ thêm -ing."],
      ["She wants going home.", "She wants to go home.", "Want + to + verb.", "Want + to + động từ."],
      ["I am interested in learn English.", "I am interested in learning English.", "Preposition + verb-ing.", "Giới từ + động từ thêm -ing."]],
    warm: [["I have finished ___ the report.", ["writing", "to write", "write", "wrote"], "Finish + verb-ing.", "Finish + động từ thêm -ing."],
      ["We decided ___ the meeting.", ["to cancel", "cancelling", "cancel", "cancelled"], "Decide + to + verb.", "Decide + to + động từ."],
      ["She is good at ___ presentations.", ["giving", "to give", "give", "gave"], "Preposition + verb-ing.", "Giới từ + động từ thêm -ing."],
      ["Would you mind ___ the window?", ["opening", "to open", "open", "opened"], "Mind + verb-ing.", "Mind + động từ thêm -ing."]],
    write: [
      ["f", "", "I enjoy to work with new people.", ["I enjoy working with new people."], "enjoy working", "Enjoy + verb-ing.", "Enjoy + động từ thêm -ing."],
      ["f", "", "She wants changing her job.", ["She wants to change her job."], "wants to change", "Want + to + verb.", "Want + to + động từ."],
      ["t", "Rewrite with: decide", "I am going to learn Japanese. That is my decision.", ["I have decided to learn Japanese.", "I decided to learn Japanese."], "decided to learn", "Decide + to + verb.", "Decide + to + động từ."],
      ["v", "", "Tôi đã viết xong báo cáo.", ["I have finished writing the report.", "I finished writing the report."], "finished writing", "Finish + verb-ing.", "Finish + động từ thêm -ing."],
      ["f", "", "He is interested in learn about our company.", ["He is interested in learning about our company."], "in learning", "Preposition + verb-ing.", "Giới từ + động từ thêm -ing."],
      ["v", "", "Chúng tôi hy vọng sẽ sớm gặp lại bạn.", ["We hope to see you again soon.", "We hope to meet you again soon.", "We hope to see you soon again."], "hope to see", "Hope + to + verb.", "Hope + to + động từ."],
      ["f", "", "Please avoid to call me after 9 pm.", ["Please avoid calling me after 9 pm."], "avoid calling", "Avoid + verb-ing.", "Avoid + động từ thêm -ing."],
      ["t", "Rewrite with: suggest", "Let's take a short break.", ["I suggest taking a short break.", "I suggest we take a short break.", "I suggest that we take a short break."], "suggest taking", "Suggest + verb-ing.", "Suggest + động từ thêm -ing."],
      ["v", "", "Cô ấy giỏi giải quyết vấn đề.", ["She is good at solving problems."], "at solving", "Good at + verb-ing.", "Good at + động từ thêm -ing."],
      ["f", "", "I need finish this today.", ["I need to finish this today."], "need to finish", "Need + to + verb.", "Need + to + động từ."],
      ["t", "Rewrite with: before + verb-ing", "I check my email. Then I start work.", ["I check my email before starting work.", "Before starting work, I check my email."], "before starting", "Before + verb-ing.", "Before + động từ thêm -ing."],
      ["v", "", "Bạn có phiền đợi vài phút không?", ["Would you mind waiting a few minutes?", "Do you mind waiting a few minutes?", "Would you mind waiting for a few minutes?", "Do you mind waiting for a few minutes?"], "mind waiting", "Mind + verb-ing.", "Mind + động từ thêm -ing."]
    ],
    free: ["Write 3 to 5 sentences about what you enjoy doing, what you want to do this year, and what you are good at doing.", "Viết 3 đến 5 câu về việc bạn thích làm, việc bạn muốn làm trong năm nay, và việc bạn giỏi."]
  });

  add('reported-speech', {
    rule: ["Reported speech tells what someone said without their exact words. After a past reporting verb (said, told, asked) the tense usually moves one step back: present to past, will to would, can to could, past simple to past perfect. Pronouns and time words change too (I to he or she, tomorrow to the next day). Use said (that), or told + person (that). Reported questions use asked + if or a question word, with normal word order and no do, does or did.",
      "Câu tường thuật thuật lại lời ai đó mà không dùng nguyên văn. Sau động từ tường thuật ở quá khứ (said, told, asked), thì thường lùi một bậc: hiện tại thành quá khứ, will thành would, can thành could, quá khứ đơn thành quá khứ hoàn thành. Đại từ và từ chỉ thời gian cũng đổi (I thành he hoặc she, tomorrow thành the next day). Dùng said (that), hoặc told + người nghe (that). Câu hỏi tường thuật dùng asked + if hoặc từ để hỏi, với trật tự câu kể và không có do, does, did."],
    forms: ["said (that) + subject + verb one tense back", "told + person + (that) + subject + verb", "asked + (person) + if / question word + subject + verb"],
    ex: [["She said that she was busy.", "Cô ấy nói rằng cô ấy đang bận."], ["He told me that he would call later.", "Anh ấy bảo tôi rằng anh ấy sẽ gọi lại sau."], ["They asked if I could start on Monday.", "Họ hỏi liệu tôi có thể bắt đầu vào thứ Hai không."], ["She asked me where I worked.", "Cô ấy hỏi tôi làm việc ở đâu."]],
    mis: [["She said me that she was tired.", "She told me that she was tired.", "Say has no person object: use told me.", "Say không đi với tân ngữ chỉ người: dùng told me."],
      ["He asked where did I live.", "He asked where I lived.", "Reported questions use normal word order.", "Câu hỏi tường thuật dùng trật tự câu kể."],
      ["She said that she will come.", "She said that she would come.", "After said, will becomes would.", "Sau said, will thành would."]],
    warm: [["He ___ me that the meeting was cancelled.", ["told", "said", "asked", "spoke"], "Told + person.", "Told + người nghe."],
      ["She said that she ___ tired.", ["was", "is being", "will be", "be"], "Present becomes past after said.", "Sau said, hiện tại thành quá khứ."],
      ["They asked me where I ___.", ["lived", "did live", "do live", "living"], "Normal word order, no did.", "Trật tự câu kể, không có did."],
      ["He asked ___ I could help him.", ["if", "that", "what", "do"], "A yes/no question: asked if.", "Câu hỏi yes/no: asked if."]],
    write: [
      ["f", "", "She said me that she was busy.", ["She told me that she was busy.", "She told me she was busy.", "She said that she was busy.", "She said she was busy."], "told me", "Say has no person object: use told me.", "Say không đi với tân ngữ chỉ người: dùng told me."],
      ["f", "", "He asked me where did I work.", ["He asked me where I worked."], "where I worked", "Reported questions use normal word order.", "Câu hỏi tường thuật dùng trật tự câu kể."],
      ["t", "Report it. Start with: She said that", "\"I am tired.\"", ["She said that she was tired."], "she was tired", "Am becomes was; I becomes she.", "Am thành was; I thành she."],
      ["v", "", "Anh ấy nói rằng anh ấy sẽ gọi lại cho tôi.", ["He said that he would call me back.", "He said he would call me back.", "He told me that he would call me back.", "He told me he would call me back.", "He said that he would call me again."], "would call", "Will becomes would after said.", "Sau said, will thành would."],
      ["f", "", "They said that they will send the contract.", ["They said that they would send the contract.", "They said they would send the contract."], "would send", "After said, will becomes would.", "Sau said, will thành would."],
      ["v", "", "Cô ấy hỏi tôi có nói được tiếng Anh không.", ["She asked me if I could speak English.", "She asked if I could speak English.", "She asked me whether I could speak English.", "She asked me if I spoke English.", "She asked whether I could speak English."], "if I could speak", "Yes/no question: asked if + normal order.", "Câu hỏi yes/no: asked if + trật tự câu kể."],
      ["f", "", "She told that she was leaving the company.", ["She said that she was leaving the company.", "She said she was leaving the company.", "She told me that she was leaving the company.", "She told us that she was leaving the company."], "said that", "Told needs a person: told me. Or use said.", "Told cần người nghe: told me. Hoặc dùng said."],
      ["t", "Report it. Start with: He told me that", "\"I can't come to the meeting.\"", ["He told me that he couldn't come to the meeting.", "He told me that he could not come to the meeting."], "he couldn't come", "Can't becomes couldn't.", "Can't thành couldn't."],
      ["v", "", "Quản lý bảo chúng tôi rằng cuộc họp đã bị hủy.", ["The manager told us that the meeting was cancelled.", "The manager told us the meeting was cancelled.", "The manager told us that the meeting had been cancelled.", "The manager told us that the meeting was canceled.", "The manager told us the meeting had been cancelled."], "told us", "Told + person + that.", "Told + người nghe + that."],
      ["f", "", "I asked her what time does the shop open.", ["I asked her what time the shop opened.", "I asked her what time the shop opens."], "the shop opened", "No does in a reported question.", "Câu hỏi tường thuật không có does."],
      ["t", "Report it. Start with: She asked me", "\"Where do you live?\"", ["She asked me where I lived."], "where I lived", "Question word + subject + verb, one tense back.", "Từ để hỏi + chủ ngữ + động từ, lùi một thì."],
      ["v", "", "Họ nói rằng họ đang làm việc với một dự án mới.", ["They said that they were working on a new project.", "They said they were working on a new project.", "They told me that they were working on a new project.", "They told us that they were working on a new project."], "were working", "Are working becomes were working.", "Are working thành were working."]
    ],
    free: ["Write 3 to 5 sentences reporting what people said to you this week: your manager, a colleague, a friend or someone in your family.", "Viết 3 đến 5 câu thuật lại những điều người khác đã nói với bạn trong tuần này: quản lý, đồng nghiệp, bạn bè hoặc người thân."]
  });

  add('dependent-prepositions', {
    rule: ["Many verbs and adjectives are followed by a fixed preposition, and it is often different from Vietnamese. Learn them as pairs: interested in, good at, afraid of, different from, responsible for, married to, depend on, wait for, listen to, apply for, agree with, belong to, look at, talk about. Some verbs take no preposition at all: discuss something, enter a room, marry someone. A verb after a preposition takes -ing.",
      "Nhiều động từ và tính từ đi với một giới từ cố định, và thường khác với tiếng Việt. Hãy học theo cặp: interested in, good at, afraid of, different from, responsible for, married to, depend on, wait for, listen to, apply for, agree with, belong to, look at, talk about. Một số động từ không cần giới từ: discuss something, enter a room, marry someone. Động từ đứng sau giới từ phải thêm -ing."],
    forms: ["adjective + preposition: interested in, good at, responsible for", "verb + preposition: depend on, wait for, listen to, apply for", "no preposition: discuss, enter, marry, contact"],
    ex: [["I am interested in this position.", "Tôi quan tâm đến vị trí này."], ["It depends on the budget.", "Việc đó tùy thuộc vào ngân sách."], ["She is responsible for hiring.", "Cô ấy chịu trách nhiệm tuyển dụng."], ["We discussed the plan yesterday.", "Hôm qua chúng tôi đã thảo luận kế hoạch."]],
    mis: [["It depends of the price.", "It depends on the price.", "Depend + on.", "Depend + on."],
      ["We discussed about the problem.", "We discussed the problem.", "Discuss takes no preposition.", "Discuss không đi với giới từ."],
      ["She is married with a doctor.", "She is married to a doctor.", "Married + to.", "Married + to."]],
    warm: [["I am interested ___ working abroad.", ["in", "on", "about", "for"], "Interested + in.", "Interested + in."],
      ["Please wait ___ me at the door.", ["for", "to", "on", "at"], "Wait + for.", "Wait + for."],
      ["He is very good ___ negotiating.", ["at", "in", "for", "with"], "Good + at.", "Good + at."],
      ["I don't agree ___ you.", ["with", "to", "about", "on"], "Agree + with + person.", "Agree + with + người."]],
    write: [
      ["f", "", "It depends of the salary.", ["It depends on the salary."], "depends on", "Depend + on.", "Depend + on."],
      ["f", "", "We discussed about the new project.", ["We discussed the new project."], "discussed the", "Discuss takes no preposition.", "Discuss không đi với giới từ."],
      ["t", "Rewrite with: interested", "This job interests me.", ["I am interested in this job."], "interested in", "Interested + in.", "Interested + in."],
      ["v", "", "Tôi chịu trách nhiệm tuyển dụng nhân viên mới.", ["I am responsible for hiring new staff.", "I am responsible for recruiting new staff.", "I am responsible for hiring new employees.", "I am responsible for recruiting new employees.", "I am in charge of hiring new staff."], "responsible for", "Responsible + for + verb-ing.", "Responsible + for + động từ thêm -ing."],
      ["f", "", "She is married with an engineer.", ["She is married to an engineer."], "married to", "Married + to.", "Married + to."],
      ["v", "", "Anh ấy đã ứng tuyển vào vị trí quản lý.", ["He applied for the manager position.", "He applied for the position of manager.", "He applied for the management position.", "He has applied for the manager position.", "He applied for a manager position."], "applied for", "Apply + for + a job.", "Apply + for + công việc."],
      ["f", "", "I am waiting your reply.", ["I am waiting for your reply."], "waiting for", "Wait + for.", "Wait + for."],
      ["t", "Rewrite with: good", "She solves problems very well.", ["She is good at solving problems.", "She is very good at solving problems."], "good at", "Good + at + verb-ing.", "Good + at + động từ thêm -ing."],
      ["v", "", "Tôi không đồng ý với ý kiến của bạn.", ["I don't agree with your opinion.", "I don't agree with you.", "I disagree with your opinion.", "I don't agree with your idea."], "agree with", "Agree + with.", "Agree + with."],
      ["f", "", "Please listen me carefully.", ["Please listen to me carefully."], "listen to", "Listen + to.", "Listen + to."],
      ["t", "Rewrite with: different", "My job and your job are not the same.", ["My job is different from your job.", "My job is different from yours.", "My job is different to yours."], "different from", "Different + from.", "Different + from."],
      ["v", "", "Cô ấy sợ nói trước đám đông.", ["She is afraid of speaking in public.", "She is afraid of public speaking.", "She is afraid of speaking in front of people.", "She is scared of speaking in public.", "She is afraid of speaking in front of a crowd."], "afraid of", "Afraid + of + verb-ing.", "Afraid + of + động từ thêm -ing."]
    ],
    free: ["Write 3 to 5 sentences about your work using these pairs: interested in, good at, responsible for, depend on, apply for.", "Viết 3 đến 5 câu về công việc của bạn, dùng các cặp: interested in, good at, responsible for, depend on, apply for."]
  });

  add('used-to', {
    rule: ["Used to + base verb talks about a past habit or state that is not true now: I used to smoke. The negative is didn't use to and the question is Did you use to. Be used to + noun or verb-ing means something is normal for you now: I am used to getting up early. Get used to + noun or verb-ing means becoming comfortable with something new. There is no present form of used to for habits: use usually + present simple.",
      "Used to + động từ nguyên mẫu nói về thói quen hoặc trạng thái trong quá khứ mà nay không còn: I used to smoke. Phủ định là didn't use to và câu hỏi là Did you use to. Be used to + danh từ hoặc động từ thêm -ing nghĩa là đã quen với điều gì đó: I am used to getting up early. Get used to + danh từ hoặc động từ thêm -ing nghĩa là dần quen với điều mới. Không có dạng hiện tại của used to cho thói quen: dùng usually + hiện tại đơn."],
    forms: ["Subject + used to + base verb", "Subject + didn't use to + base verb / Did + subject + use to + base verb?", "Subject + am / is / are used to + noun or verb-ing", "Subject + get used to + noun or verb-ing"],
    ex: [["I used to live in Hue.", "Trước đây tôi từng sống ở Huế."], ["She didn't use to like coffee.", "Trước đây cô ấy không thích cà phê."], ["I am used to working late.", "Tôi đã quen với việc làm muộn."], ["He is getting used to his new job.", "Anh ấy đang dần quen với công việc mới."]],
    mis: [["I use to play football.", "I used to play football.", "The past habit form is used to.", "Dạng chỉ thói quen quá khứ là used to."],
      ["I am used to get up early.", "I am used to getting up early.", "Be used to + verb-ing.", "Be used to + động từ thêm -ing."],
      ["She didn't used to drive.", "She didn't use to drive.", "After didn't: use to.", "Sau didn't: use to."]],
    warm: [["I ___ work in a bank, but now I work in IT.", ["used to", "use to", "am used to", "was used to"], "A past state: used to + base verb.", "Trạng thái trong quá khứ: used to + động từ nguyên mẫu."],
      ["She is used to ___ long hours.", ["working", "work", "worked", "works"], "Be used to + verb-ing.", "Be used to + động từ thêm -ing."],
      ["Did you ___ to live here?", ["use", "used", "using", "uses"], "After did: use to.", "Sau did: use to."],
      ["It took me a month to ___ the new system.", ["get used to", "used to", "be use to", "use to"], "Becoming comfortable: get used to.", "Dần quen: get used to."]],
    write: [
      ["f", "", "I use to play football when I was a child.", ["I used to play football when I was a child."], "used to play", "The past habit form is used to.", "Dạng chỉ thói quen quá khứ là used to."],
      ["f", "", "I am used to work at night.", ["I am used to working at night."], "used to working", "Be used to + verb-ing.", "Be used to + động từ thêm -ing."],
      ["t", "Rewrite with: used to", "I lived in Hanoi in the past, but I don't now.", ["I used to live in Hanoi."], "used to live", "A past state: used to + base verb.", "Trạng thái trong quá khứ: used to + động từ nguyên mẫu."],
      ["v", "", "Trước đây tôi từng làm việc ở một ngân hàng.", ["I used to work in a bank.", "I used to work at a bank.", "I used to work for a bank."], "used to work", "Past habit or state: used to + base verb.", "Thói quen hoặc trạng thái quá khứ: used to + động từ nguyên mẫu."],
      ["f", "", "She didn't used to drink coffee.", ["She didn't use to drink coffee."], "didn't use to", "After didn't: use to.", "Sau didn't: use to."],
      ["v", "", "Tôi đã quen với việc dậy sớm.", ["I am used to getting up early.", "I am used to waking up early.", "I have got used to getting up early.", "I am used to getting up early in the morning."], "used to getting", "Be used to + verb-ing.", "Be used to + động từ thêm -ing."],
      ["f", "", "He is getting used to drive on the left.", ["He is getting used to driving on the left."], "used to driving", "Get used to + verb-ing.", "Get used to + động từ thêm -ing."],
      ["t", "Make it a question.", "You used to work here.", ["Did you use to work here?"], "Did you use to", "Question: Did + subject + use to.", "Câu hỏi: Did + chủ ngữ + use to."],
      ["v", "", "Trước đây anh ấy không thích công việc này.", ["He didn't use to like this job.", "He did not use to like this job.", "He used not to like this job."], "didn't use to like", "Negative: didn't use to + base verb.", "Phủ định: didn't use to + động từ nguyên mẫu."],
      ["f", "", "I used to getting up late, but now I get up at six.", ["I used to get up late, but now I get up at six."], "used to get", "Past habit: used to + base verb.", "Thói quen quá khứ: used to + động từ nguyên mẫu."],
      ["t", "Rewrite with: be used to", "Working with foreign clients is normal for her.", ["She is used to working with foreign clients."], "used to working", "Normal for her now: is used to + verb-ing.", "Đã quen: is used to + động từ thêm -ing."],
      ["v", "", "Cô ấy đang dần quen với văn phòng mới.", ["She is getting used to the new office.", "She is getting used to her new office."], "getting used to", "Becoming comfortable: get used to + noun.", "Dần quen: get used to + danh từ."]
    ],
    free: ["Write 3 to 5 sentences about how your life has changed: things you used to do, and things you are used to doing now.", "Viết 3 đến 5 câu về việc cuộc sống của bạn đã thay đổi thế nào: những việc trước đây bạn từng làm, và những việc bây giờ bạn đã quen."]
  });
})();
