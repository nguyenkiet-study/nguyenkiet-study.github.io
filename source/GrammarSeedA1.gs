/**
 * GrammarSeedA1.gs
 * Hand-written grammar lessons for the A1 topics. See GrammarSeed.gs for the short form.
 */
(function () {
  var add = GrammarSeed.add;

  add('be-present', {
    rule: ["Use am with I, is with he, she, it and a singular noun, and are with you, we, they and plural nouns. In everyday speech we shorten them: I'm, he's, they're. For a negative add not (I am not, he isn't, they aren't). For a question put am, is or are before the subject: Are you ready? English always needs a verb here: Vietnamese can say 'Tôi nhân viên', but English must say I am an employee.",
      "Dùng am với I, is với he, she, it và danh từ số ít, are với you, we, they và danh từ số nhiều. Khi nói nhanh ta rút gọn: I'm, he's, they're. Phủ định thêm not (I am not, he isn't, they aren't). Câu hỏi đặt am, is hoặc are trước chủ ngữ: Are you ready? Tiếng Anh luôn cần động từ ở đây: tiếng Việt có thể nói 'Tôi nhân viên', nhưng tiếng Anh phải nói I am an employee."],
    forms: ["I am / You are / He, she, it is / We, you, they are", "Subject + am / is / are + not", "Am / Is / Are + subject + ...?"],
    ex: [["I am a recruiter.", "Tôi là nhân viên tuyển dụng."], ["She is at the office today.", "Hôm nay cô ấy ở văn phòng."], ["We are not late.", "Chúng tôi không bị muộn."], ["Are they from Hanoi?", "Họ có phải người Hà Nội không?"]],
    mis: [["She are a manager.", "She is a manager.", "She takes is.", "She đi với is."],
      ["I am agree with you.", "I agree with you.", "Agree is already a verb, so do not add am.", "Agree đã là động từ nên không thêm am."],
      ["Is you ready?", "Are you ready?", "You takes are, also in questions.", "You đi với are, cả trong câu hỏi."]],
    warm: [["She ___ my manager.", ["is", "are", "am", "be"], "She takes is.", "She đi với is."],
      ["We ___ in the meeting room.", ["are", "is", "am", "be"], "We takes are.", "We đi với are."],
      ["___ you ready for the interview?", ["Are", "Is", "Am", "Do"], "A question with you starts with Are.", "Câu hỏi với you bắt đầu bằng Are."],
      ["I ___ not late today.", ["am", "is", "are", "be"], "I takes am.", "I đi với am."]],
    write: [
      ["f", "", "He are a new employee.", ["He is a new employee."], "is", "He takes is.", "He đi với is."],
      ["f", "", "I is happy today.", ["I am happy today.", "I'm happy today."], "am", "I takes am.", "I đi với am."],
      ["t", "Make it negative.", "She is at work.", ["She isn't at work.", "She is not at work.", "She's not at work."], "isn't", "Negative: is + not, or isn't.", "Phủ định: is + not, hoặc isn't."],
      ["v", "", "Tôi là nhân viên tuyển dụng.", ["I am a recruiter.", "I'm a recruiter.", "I am a recruitment officer."], "am", "I takes am, and we need a before a job.", "I đi với am, và trước nghề nghiệp cần có a."],
      ["t", "Make it a question.", "You are ready.", ["Are you ready?"], "Are you", "Question: Are + subject.", "Câu hỏi: Are + chủ ngữ."],
      ["v", "", "Họ không ở văn phòng hôm nay.", ["They aren't in the office today.", "They are not in the office today.", "They're not in the office today."], "aren't", "They takes are; negative is aren't or are not.", "They đi với are; phủ định là aren't hoặc are not."],
      ["f", "", "Is they from Hanoi?", ["Are they from Hanoi?"], "Are they", "They takes are, also in questions.", "They đi với are, cả trong câu hỏi."],
      ["t", "Make it negative.", "I am late.", ["I am not late.", "I'm not late."], "am not", "After I use am not. We do not say I amn't.", "Sau I dùng am not. Không nói I amn't."],
      ["v", "", "Bạn có phải là quản lý không?", ["Are you a manager?"], "Are you", "Question: Are + you + a + job.", "Câu hỏi: Are + you + a + nghề nghiệp."],
      ["f", "", "We is in the meeting room.", ["We are in the meeting room."], "are", "We takes are.", "We đi với are."],
      ["t", "Make it a question.", "The report is ready.", ["Is the report ready?"], "Is the report", "Question: Is + subject.", "Câu hỏi: Is + chủ ngữ."],
      ["v", "", "Cô ấy là bạn của tôi.", ["She is my friend.", "She's my friend.", "She is a friend of mine."], "is", "She takes is.", "She đi với is."]
    ],
    free: ["Write 3 to 5 sentences about yourself: your name, your job and where you are from. Use am, is and are.", "Viết 3 đến 5 câu về bản thân: tên, nghề nghiệp và bạn đến từ đâu. Dùng am, is và are."]
  });

  add('present-simple', {
    rule: ["Use the present simple for habits, routines and facts: I start work at eight. The sun rises in the east. With he, she and it, add -s or -es to the verb (works, watches, studies). For a negative use do not (don't) or does not (doesn't) + base verb. For a question use Do or Does + subject + base verb. After does and doesn't the verb never takes -s.",
      "Dùng hiện tại đơn cho thói quen, việc lặp lại và sự thật: I start work at eight. The sun rises in the east. Với he, she và it, thêm -s hoặc -es vào động từ (works, watches, studies). Phủ định dùng do not (don't) hoặc does not (doesn't) + động từ nguyên mẫu. Câu hỏi dùng Do hoặc Does + chủ ngữ + động từ nguyên mẫu. Sau does và doesn't động từ không thêm -s."],
    forms: ["I / You / We / They + base verb; He / She / It + verb-s", "Subject + do not (don't) / does not (doesn't) + base verb", "Do / Does + subject + base verb?"],
    ex: [["I start work at eight o'clock.", "Tôi bắt đầu làm việc lúc tám giờ."], ["She works in a bank.", "Cô ấy làm việc ở ngân hàng."], ["He doesn't drink coffee.", "Anh ấy không uống cà phê."], ["Do you speak English at work?", "Bạn có nói tiếng Anh ở nơi làm việc không?"]],
    mis: [["She work in an office.", "She works in an office.", "With she, the verb takes -s.", "Với she, động từ thêm -s."],
      ["He doesn't works here.", "He doesn't work here.", "After doesn't, use the base verb.", "Sau doesn't dùng động từ nguyên mẫu."],
      ["Do she like tea?", "Does she like tea?", "With she, the question starts with Does.", "Với she, câu hỏi bắt đầu bằng Does."]],
    warm: [["She ___ at eight o'clock every day.", ["starts", "start", "starting", "is start"], "With she, add -s.", "Với she, thêm -s."],
      ["I ___ coffee in the morning.", ["drink", "drinks", "drinking", "am drink"], "With I, use the base verb.", "Với I, dùng động từ nguyên mẫu."],
      ["He doesn't ___ English at work.", ["speak", "speaks", "speaking", "spoke"], "After doesn't, use the base verb.", "Sau doesn't dùng động từ nguyên mẫu."],
      ["___ they work on Saturday?", ["Do", "Does", "Are", "Is"], "With they, use Do.", "Với they, dùng Do."]],
    write: [
      ["f", "", "She work in a bank.", ["She works in a bank."], "works", "With she, add -s.", "Với she, thêm -s."],
      ["f", "", "He don't like fish.", ["He doesn't like fish.", "He does not like fish."], "doesn't", "With he, use doesn't.", "Với he, dùng doesn't."],
      ["t", "Make it negative.", "They start at eight.", ["They don't start at eight.", "They do not start at eight."], "don't start", "Negative: don't + base verb.", "Phủ định: don't + động từ nguyên mẫu."],
      ["v", "", "Tôi uống cà phê mỗi sáng.", ["I drink coffee every morning.", "Every morning I drink coffee.", "I drink coffee in the morning."], "drink", "A habit: present simple.", "Thói quen: hiện tại đơn."],
      ["t", "Make it a question.", "She works on Saturday.", ["Does she work on Saturday?"], "Does she work", "Question: Does + subject + base verb.", "Câu hỏi: Does + chủ ngữ + động từ nguyên mẫu."],
      ["v", "", "Anh ấy không làm việc ở Hà Nội.", ["He doesn't work in Hanoi.", "He does not work in Hanoi."], "doesn't work", "Negative: doesn't + base verb.", "Phủ định: doesn't + động từ nguyên mẫu."],
      ["f", "", "Do he live near the office?", ["Does he live near the office?"], "Does he live", "With he, the question starts with Does.", "Với he, câu hỏi bắt đầu bằng Does."],
      ["f", "", "My sister go to school by bus.", ["My sister goes to school by bus."], "goes", "Go takes -es with he, she, it.", "Go thêm -es với he, she, it."],
      ["t", "Make it negative.", "He likes tea.", ["He doesn't like tea.", "He does not like tea."], "doesn't like", "After doesn't, the verb loses its -s.", "Sau doesn't, động từ bỏ -s."],
      ["v", "", "Bạn có nói tiếng Anh ở công ty không?", ["Do you speak English at work?", "Do you speak English at the company?", "Do you speak English in the office?"], "Do you speak", "Question: Do + you + base verb.", "Câu hỏi: Do + you + động từ nguyên mẫu."],
      ["f", "", "She studys English every evening.", ["She studies English every evening."], "studies", "Consonant + y becomes -ies.", "Phụ âm + y đổi thành -ies."],
      ["v", "", "Cửa hàng mở cửa lúc chín giờ.", ["The shop opens at nine o'clock.", "The shop opens at nine.", "The store opens at nine."], "opens", "With a singular subject, add -s.", "Với chủ ngữ số ít, thêm -s."]
    ],
    free: ["Write 3 to 5 sentences about your daily routine at work. Use the present simple.", "Viết 3 đến 5 câu về thói quen hằng ngày ở nơi làm việc. Dùng hiện tại đơn."]
  });

  add('articles', {
    rule: ["Use a before a consonant sound and an before a vowel sound: a manager, an engineer, an hour (silent h), a university (it starts with the sound /j/). Use a or an for one thing that is new or not specific. Use the when both speaker and listener know which thing: Close the door. English singular countable nouns need an article or another word like my or this. Vietnamese has no articles, so this is easy to forget.",
      "Dùng a trước âm phụ âm và an trước âm nguyên âm: a manager, an engineer, an hour (h câm), a university (bắt đầu bằng âm /j/). Dùng a hoặc an cho một vật mới hoặc chưa xác định. Dùng the khi người nói và người nghe đều biết đó là vật nào: Close the door. Danh từ đếm được số ít trong tiếng Anh cần mạo từ hoặc từ khác như my, this. Tiếng Việt không có mạo từ nên rất dễ quên."],
    forms: ["a + consonant sound: a manager, a university", "an + vowel sound: an engineer, an hour", "the + a specific thing: the door, the report"],
    ex: [["I need a pen.", "Tôi cần một cây bút."], ["She has an umbrella.", "Cô ấy có một cái ô."], ["The manager is in the meeting room.", "Quản lý đang ở phòng họp."], ["He is an honest man.", "Anh ấy là một người trung thực."]],
    mis: [["She is a engineer.", "She is an engineer.", "Engineer starts with a vowel sound, so use an.", "Engineer bắt đầu bằng âm nguyên âm nên dùng an."],
      ["I work in office.", "I work in an office.", "A singular countable noun needs a or an.", "Danh từ đếm được số ít cần a hoặc an."],
      ["I need an university card.", "I need a university card.", "University starts with the sound /j/, so use a.", "University bắt đầu bằng âm /j/ nên dùng a."]],
    warm: [["She is ___ engineer.", ["an", "a", "the", "some"], "Engineer starts with a vowel sound.", "Engineer bắt đầu bằng âm nguyên âm."],
      ["I have ___ appointment at ten.", ["an", "a", "the", "any"], "Appointment starts with a vowel sound.", "Appointment bắt đầu bằng âm nguyên âm."],
      ["Please close ___ door.", ["the", "a", "an", "one"], "Both of us know which door.", "Cả hai đều biết cửa nào."],
      ["He is ___ honest man.", ["an", "a", "the", "any"], "The h in honest is silent, so it starts with a vowel sound.", "Chữ h trong honest là âm câm nên bắt đầu bằng âm nguyên âm."]],
    write: [
      ["f", "", "He is a engineer.", ["He is an engineer."], "an engineer", "Engineer starts with a vowel sound.", "Engineer bắt đầu bằng âm nguyên âm."],
      ["f", "", "I work in office.", ["I work in an office."], "an office", "A singular countable noun needs a or an.", "Danh từ đếm được số ít cần a hoặc an."],
      ["t", "Change a to the, because we know which one.", "I need a document.", ["I need the document."], "the document", "Use the for a specific thing both people know.", "Dùng the cho vật cụ thể mà cả hai đều biết."],
      ["v", "", "Tôi có một cuộc hẹn lúc mười giờ.", ["I have an appointment at ten o'clock.", "I have an appointment at ten."], "an appointment", "Appointment starts with a vowel sound: an.", "Appointment bắt đầu bằng âm nguyên âm: an."],
      ["t", "Rewrite as one thing, with a or an.", "I have two umbrellas.", ["I have an umbrella."], "an umbrella", "Umbrella starts with a vowel sound: an.", "Umbrella bắt đầu bằng âm nguyên âm: an."],
      ["v", "", "Cô ấy là một giáo viên.", ["She is a teacher."], "a teacher", "A job needs a or an in English.", "Nghề nghiệp trong tiếng Anh cần a hoặc an."],
      ["f", "", "Please open door.", ["Please open the door."], "the door", "A specific door needs the.", "Cái cửa cụ thể cần the."],
      ["f", "", "I need an university card.", ["I need a university card."], "a university", "University starts with the sound /j/: use a.", "University bắt đầu bằng âm /j/: dùng a."],
      ["t", "Change a to the where we mean the same one.", "I bought a laptop. A laptop is very light.", ["I bought a laptop. The laptop is very light."], "The laptop", "The second time we mention it, use the.", "Nhắc lần thứ hai thì dùng the."],
      ["v", "", "Anh ấy là một người đàn ông trung thực.", ["He is an honest man."], "an honest", "Honest starts with a vowel sound: an.", "Honest bắt đầu bằng âm nguyên âm: an."],
      ["f", "", "She has apple and banana.", ["She has an apple and a banana."], "an apple", "Each singular noun needs a or an.", "Mỗi danh từ số ít cần a hoặc an."],
      ["v", "", "Làm ơn đóng cửa sổ lại.", ["Please close the window.", "Close the window, please."], "the window", "A specific window needs the.", "Cái cửa sổ cụ thể cần the."]
    ],
    free: ["Write 3 to 5 sentences about your office or your desk. Use a, an and the.", "Viết 3 đến 5 câu về văn phòng hoặc bàn làm việc của bạn. Dùng a, an và the."]
  });

  add('plurals', {
    rule: ["Most nouns add -s for the plural: report, reports. After s, x, ch and sh add -es: box, boxes; watch, watches. After a consonant + y change y to -ies: company, companies. Some common nouns are irregular: man, men; woman, women; child, children; person, people. Use a plural after two, three, many and a lot of. Vietnamese does not change the noun, so remember the -s.",
      "Hầu hết danh từ thêm -s để thành số nhiều: report, reports. Sau s, x, ch và sh thêm -es: box, boxes; watch, watches. Sau phụ âm + y đổi y thành -ies: company, companies. Một số danh từ thông dụng bất quy tắc: man, men; woman, women; child, children; person, people. Dùng số nhiều sau two, three, many và a lot of. Tiếng Việt không đổi danh từ nên dễ quên thêm -s."],
    forms: ["noun + -s: report, reports", "s, x, ch, sh + -es: box, boxes", "consonant + y: -ies; irregular: man, men; child, children"],
    ex: [["We have two meetings today.", "Hôm nay chúng tôi có hai cuộc họp."], ["There are three boxes on the desk.", "Có ba cái hộp trên bàn."], ["She has two companies.", "Cô ấy có hai công ty."], ["The children are at school.", "Bọn trẻ đang ở trường."]],
    mis: [["I have two brother.", "I have two brothers.", "After two, use the plural: brothers.", "Sau two dùng số nhiều: brothers."],
      ["There are three box.", "There are three boxes.", "Box ends in x, so add -es.", "Box tận cùng là x nên thêm -es."],
      ["Two childs are here.", "Two children are here.", "Child has an irregular plural: children.", "Child có số nhiều bất quy tắc: children."]],
    warm: [["We have two ___ in the team.", ["managers", "manager", "manageres", "managerses"], "Add -s after two.", "Thêm -s sau two."],
      ["There are three ___ on the table.", ["boxes", "boxs", "box", "boxies"], "Box ends in x: add -es.", "Box tận cùng là x: thêm -es."],
      ["Two ___ are in the office.", ["women", "womans", "womens", "woman"], "Woman has an irregular plural: women.", "Woman có số nhiều bất quy tắc: women."],
      ["She has five ___.", ["children", "childs", "childrens", "child"], "Child has an irregular plural: children.", "Child có số nhiều bất quy tắc: children."]],
    write: [
      ["f", "", "I have two brother.", ["I have two brothers."], "brothers", "After two, use the plural.", "Sau two dùng số nhiều."],
      ["f", "", "There are three box on the desk.", ["There are three boxes on the desk."], "boxes", "Box ends in x: add -es.", "Box tận cùng là x: thêm -es."],
      ["t", "Make it plural.", "The child is in the room.", ["The children are in the room."], "children are", "Child becomes children, and is becomes are.", "Child thành children, và is thành are."],
      ["v", "", "Chúng tôi có hai cuộc họp hôm nay.", ["We have two meetings today.", "We have two meetings this day."], "meetings", "After two, use the plural.", "Sau two dùng số nhiều."],
      ["t", "Make it plural.", "This is my friend.", ["These are my friends."], "friends", "This becomes these, and the noun takes -s.", "This thành these, và danh từ thêm -s."],
      ["v", "", "Có năm phụ nữ trong phòng.", ["There are five women in the room."], "women", "Woman has an irregular plural: women.", "Woman có số nhiều bất quy tắc: women."],
      ["f", "", "The childs are at school.", ["The children are at school."], "children", "Child has an irregular plural: children.", "Child có số nhiều bất quy tắc: children."],
      ["f", "", "She has two company.", ["She has two companies."], "companies", "Consonant + y becomes -ies.", "Phụ âm + y đổi thành -ies."],
      ["t", "Make it plural.", "I have a new phone.", ["I have new phones.", "We have new phones."], "phones", "Take away a and add -s.", "Bỏ a và thêm -s."],
      ["v", "", "Những người này làm việc ở Hà Nội.", ["These people work in Hanoi."], "people", "Person has the plural people, and the verb has no -s.", "Person có số nhiều là people, và động từ không thêm -s."],
      ["f", "", "She has two watch.", ["She has two watches."], "watches", "Watch ends in ch: add -es.", "Watch tận cùng là ch: thêm -es."],
      ["v", "", "Tôi có ba đứa con.", ["I have three children."], "children", "Child has an irregular plural: children.", "Child có số nhiều bất quy tắc: children."]
    ],
    free: ["Write 3 to 5 sentences about the things and people in your office. Use plural nouns.", "Viết 3 đến 5 câu về đồ vật và con người trong văn phòng của bạn. Dùng danh từ số nhiều."]
  });

  add('there-is', {
    rule: ["Use there is for one thing or an uncountable thing, and there are for more than one: There is a meeting at ten. There are three desks here. Negatives are there isn't and there aren't. Questions put is or are first: Is there a printer? Are there any chairs? In Vietnamese we say 'Có ...', but English cannot start with have here: say There is, not Have.",
      "Dùng there is cho một vật hoặc danh từ không đếm được, và there are cho nhiều hơn một: There is a meeting at ten. There are three desks here. Phủ định là there isn't và there aren't. Câu hỏi đặt is hoặc are lên trước: Is there a printer? Are there any chairs? Tiếng Việt nói 'Có ...', nhưng tiếng Anh không bắt đầu bằng have ở đây: nói There is, không nói Have."],
    forms: ["There is + singular / uncountable noun", "There are + plural noun", "There isn't / aren't (any) + noun; Is / Are there (any) + noun?"],
    ex: [["There is a meeting at ten.", "Có một cuộc họp lúc mười giờ."], ["There are three desks in the room.", "Có ba cái bàn trong phòng."], ["There isn't a printer on this floor.", "Không có máy in ở tầng này."], ["Are there any chairs in the room?", "Trong phòng có cái ghế nào không?"]],
    mis: [["Have a coffee machine in the office.", "There is a coffee machine in the office.", "Do not use have for existence: use there is.", "Không dùng have để nói 'có': dùng there is."],
      ["There is two desks.", "There are two desks.", "Two desks is plural: there are.", "Two desks là số nhiều: there are."],
      ["There are not a printer.", "There isn't a printer.", "One thing: there isn't.", "Một vật: there isn't."]],
    warm: [["___ a meeting at ten.", ["There is", "There are", "It is", "Have"], "One meeting: there is.", "Một cuộc họp: there is."],
      ["___ three desks here.", ["There are", "There is", "They are", "Have"], "Plural: there are.", "Số nhiều: there are."],
      ["___ there a printer on this floor?", ["Is", "Are", "Do", "Has"], "One printer: Is there.", "Một máy in: Is there."],
      ["There ___ any water in the bottle.", ["isn't", "aren't", "don't", "hasn't"], "Water is uncountable: there isn't.", "Water không đếm được: there isn't."]],
    write: [
      ["f", "", "Have a meeting tomorrow.", ["There is a meeting tomorrow."], "There is", "To say something exists, use there is.", "Nói 'có' thì dùng there is."],
      ["f", "", "There is five people in the room.", ["There are five people in the room."], "There are", "Five people is plural: there are.", "Five people là số nhiều: there are."],
      ["t", "Make it negative.", "There is a printer in the office.", ["There isn't a printer in the office.", "There is not a printer in the office.", "There's no printer in the office."], "There isn't", "Negative: there isn't.", "Phủ định: there isn't."],
      ["v", "", "Có hai cái ghế trong phòng.", ["There are two chairs in the room."], "There are", "Two chairs is plural: there are.", "Two chairs là số nhiều: there are."],
      ["t", "Make it a question.", "There is a bank near here.", ["Is there a bank near here?"], "Is there", "Question: Is there + noun.", "Câu hỏi: Is there + danh từ."],
      ["v", "", "Không có nước trong chai.", ["There isn't any water in the bottle.", "There is no water in the bottle.", "There's no water in the bottle."], "There isn't", "Uncountable noun: there isn't any.", "Danh từ không đếm được: there isn't any."],
      ["f", "", "There are a coffee machine on the second floor.", ["There is a coffee machine on the second floor."], "There is", "One machine: there is.", "Một cái máy: there is."],
      ["f", "", "Is there two meeting rooms?", ["Are there two meeting rooms?"], "Are there", "Two rooms is plural: Are there.", "Two rooms là số nhiều: Are there."],
      ["t", "Make it negative.", "There are chairs in the room.", ["There aren't any chairs in the room.", "There are no chairs in the room.", "There are not any chairs in the room."], "There aren't", "Plural negative: there aren't any.", "Phủ định số nhiều: there aren't any."],
      ["v", "", "Có một nhà hàng gần văn phòng không?", ["Is there a restaurant near the office?"], "Is there", "Question: Is there + noun.", "Câu hỏi: Is there + danh từ."],
      ["f", "", "There isn't any desks.", ["There aren't any desks."], "aren't", "Desks is plural: aren't.", "Desks là số nhiều: aren't."],
      ["v", "", "Có ba người trong phòng họp.", ["There are three people in the meeting room."], "There are", "Three people is plural: there are.", "Three people là số nhiều: there are."]
    ],
    free: ["Write 3 to 5 sentences about what there is in your office or your home. Use there is and there are.", "Viết 3 đến 5 câu về những thứ có trong văn phòng hoặc nhà bạn. Dùng there is và there are."]
  });

  add('prepositions-time-place', {
    rule: ["For time: use at with clock times and points in the day (at nine o'clock, at night), on with days and dates (on Monday, on 5 May) and in with months, years, seasons and parts of the day (in June, in 2026, in the morning). For place: use at for a point (at the office), in for inside an area or a space (in Hanoi, in the room) and on for a surface (on the table). We say in the morning but at night.",
      "Chỉ thời gian: dùng at với giờ và thời điểm trong ngày (at nine o'clock, at night), on với thứ và ngày (on Monday, on 5 May), in với tháng, năm, mùa và buổi trong ngày (in June, in 2026, in the morning). Chỉ nơi chốn: dùng at cho một điểm (at the office), in cho bên trong một khu vực hoặc không gian (in Hanoi, in the room) và on cho bề mặt (on the table). Ta nói in the morning nhưng at night."],
    forms: ["at + clock time / point: at nine, at night, at the office", "on + day / date / surface: on Monday, on the table", "in + month / year / part of day / area: in June, in 2026, in Hanoi"],
    ex: [["The meeting is at nine o'clock.", "Cuộc họp lúc chín giờ."], ["See you on Monday.", "Hẹn gặp bạn vào thứ Hai."], ["My birthday is in June.", "Sinh nhật tôi vào tháng Sáu."], ["The report is on the table.", "Bản báo cáo ở trên bàn."]],
    mis: [["I work in Monday.", "I work on Monday.", "Days use on.", "Thứ dùng on."],
      ["The meeting is on 9 o'clock.", "The meeting is at 9 o'clock.", "Clock times use at.", "Giờ đồng hồ dùng at."],
      ["She lives at Hanoi.", "She lives in Hanoi.", "A city is an area, so use in.", "Thành phố là một khu vực nên dùng in."]],
    warm: [["The meeting is ___ 9 o'clock.", ["at", "in", "on", "to"], "Clock times use at.", "Giờ đồng hồ dùng at."],
      ["My birthday is ___ June.", ["in", "on", "at", "of"], "Months use in.", "Tháng dùng in."],
      ["See you ___ Monday.", ["on", "in", "at", "by"], "Days use on.", "Thứ dùng on."],
      ["She lives ___ Hanoi.", ["in", "at", "on", "to"], "A city: in.", "Thành phố: in."]],
    write: [
      ["f", "", "The meeting is in 9 o'clock.", ["The meeting is at 9 o'clock."], "at 9", "Clock times use at.", "Giờ đồng hồ dùng at."],
      ["f", "", "We have a class in Monday.", ["We have a class on Monday."], "on Monday", "Days use on.", "Thứ dùng on."],
      ["t", "Change the day to Friday.", "The meeting is on Monday.", ["The meeting is on Friday."], "on Friday", "Days use on.", "Thứ dùng on."],
      ["v", "", "Cuộc họp bắt đầu lúc chín giờ.", ["The meeting starts at nine o'clock.", "The meeting starts at nine.", "The meeting begins at nine o'clock."], "at nine", "Clock times use at.", "Giờ đồng hồ dùng at."],
      ["t", "Change the place to Hanoi.", "She lives in Bac Ninh.", ["She lives in Hanoi."], "in Hanoi", "A city uses in.", "Thành phố dùng in."],
      ["v", "", "Sinh nhật của tôi vào tháng Sáu.", ["My birthday is in June."], "in June", "Months use in.", "Tháng dùng in."],
      ["f", "", "He lives at Hanoi.", ["He lives in Hanoi."], "in Hanoi", "A city is an area: use in.", "Thành phố là khu vực: dùng in."],
      ["f", "", "The report is in the table.", ["The report is on the table."], "on the table", "A surface uses on.", "Bề mặt dùng on."],
      ["t", "Change the time to the morning.", "I study English at night.", ["I study English in the morning."], "in the morning", "Parts of the day use in (but at night).", "Buổi trong ngày dùng in (nhưng at night)."],
      ["v", "", "Hẹn gặp bạn vào thứ Hai nhé.", ["See you on Monday.", "I will see you on Monday."], "on Monday", "Days use on.", "Thứ dùng on."],
      ["f", "", "I am at home in Sunday.", ["I am at home on Sunday."], "on Sunday", "Days use on.", "Thứ dùng on."],
      ["v", "", "Chúng tôi làm việc ở văn phòng.", ["We work at the office.", "We work in the office.", "We work in an office.", "We work at an office."], "at the office", "At for a workplace as a point; in for inside the room.", "At cho nơi làm việc như một điểm; in cho bên trong căn phòng."]
    ],
    free: ["Write 3 to 5 sentences about your week: the days, the times and the places you work. Use in, on and at.", "Viết 3 đến 5 câu về tuần làm việc của bạn: các ngày, giờ và nơi bạn làm việc. Dùng in, on và at."]
  });

  add('can', {
    rule: ["Use can + base verb for ability and for asking or giving permission: She can speak English. Can I open the window? The negative is can't (cannot). For a question put Can before the subject: Can you help me? Can has the same form for every person: he can, not he cans. After can use the base verb, with no to and no -s.",
      "Dùng can + động từ nguyên mẫu cho khả năng và để xin hoặc cho phép: She can speak English. Can I open the window? Phủ định là can't (cannot). Câu hỏi đặt Can trước chủ ngữ: Can you help me? Can giữ nguyên dạng với mọi ngôi: he can, không phải he cans. Sau can dùng động từ nguyên mẫu, không có to và không có -s."],
    forms: ["Subject + can + base verb", "Subject + can't (cannot) + base verb", "Can + subject + base verb?"],
    ex: [["She can speak three languages.", "Cô ấy nói được ba thứ tiếng."], ["I can't see the screen.", "Tôi không nhìn thấy màn hình."], ["Can you help me, please?", "Bạn có thể giúp tôi được không?"], ["He can drive a truck.", "Anh ấy lái được xe tải."]],
    mis: [["She can speaks English.", "She can speak English.", "After can, use the base verb.", "Sau can dùng động từ nguyên mẫu."],
      ["I can to drive.", "I can drive.", "No to after can.", "Sau can không có to."],
      ["He cans swim.", "He can swim.", "Can never takes -s.", "Can không bao giờ thêm -s."]],
    warm: [["She can ___ three languages.", ["speak", "speaks", "speaking", "to speak"], "After can, use the base verb.", "Sau can dùng động từ nguyên mẫu."],
      ["I ___ drive a car.", ["can't", "don't can", "not can", "can't to"], "Negative: can't.", "Phủ định: can't."],
      ["___ you help me, please?", ["Can", "Do", "Are", "Does"], "A request: Can + subject.", "Lời nhờ: Can + chủ ngữ."],
      ["He ___ swim very well.", ["can", "cans", "can to", "is can"], "Can does not change with he.", "Can không đổi với he."]],
    write: [
      ["f", "", "She can speaks English.", ["She can speak English."], "can speak", "After can, use the base verb.", "Sau can dùng động từ nguyên mẫu."],
      ["f", "", "I can to drive a car.", ["I can drive a car."], "can drive", "No to after can.", "Sau can không có to."],
      ["t", "Make it negative.", "He can swim.", ["He can't swim.", "He cannot swim.", "He can not swim."], "can't", "Negative: can't.", "Phủ định: can't."],
      ["v", "", "Tôi có thể nói tiếng Anh.", ["I can speak English."], "can speak", "Ability: can + base verb.", "Khả năng: can + động từ nguyên mẫu."],
      ["t", "Make it a question.", "You can help me.", ["Can you help me?"], "Can you", "Question: Can + subject.", "Câu hỏi: Can + chủ ngữ."],
      ["v", "", "Cô ấy không thể đến buổi họp.", ["She can't come to the meeting.", "She cannot come to the meeting.", "She can't attend the meeting.", "She cannot attend the meeting."], "can't", "Negative: can't + base verb.", "Phủ định: can't + động từ nguyên mẫu."],
      ["f", "", "He cans use this software.", ["He can use this software."], "can use", "Can never takes -s.", "Can không bao giờ thêm -s."],
      ["f", "", "Can she speaks French?", ["Can she speak French?"], "Can she speak", "After can, use the base verb.", "Sau can dùng động từ nguyên mẫu."],
      ["t", "Make it negative.", "I can see the screen.", ["I can't see the screen.", "I cannot see the screen."], "can't see", "Negative: can't + base verb.", "Phủ định: can't + động từ nguyên mẫu."],
      ["v", "", "Bạn có thể giúp tôi được không?", ["Can you help me?", "Can you help me, please?"], "Can you help", "Question: Can + you + base verb.", "Câu hỏi: Can + you + động từ nguyên mẫu."],
      ["f", "", "They can't to work on Sunday.", ["They can't work on Sunday."], "can't work", "No to after can't.", "Sau can't không có to."],
      ["v", "", "Anh ấy có thể lái xe tải.", ["He can drive a truck.", "He can drive a lorry."], "can drive", "Can does not change with he.", "Can không đổi với he."]
    ],
    free: ["Write 3 to 5 sentences about what you can do and what you can't do. Use can and can't.", "Viết 3 đến 5 câu về những việc bạn làm được và không làm được. Dùng can và can't."]
  });
})();
