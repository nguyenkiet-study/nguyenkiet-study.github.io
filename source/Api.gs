/**
 * Api.gs
 * The only function the browser may call: apiCall(fn, payload).
 *
 * google.script.run lets any visitor call every global function whose name does not end in an underscore.
 * So the server code lives in objects (Db, Auth, Profile, Words, Grammar, History, Practice, Plan, Progress, Placement, Social), the only global functions are apiCall,
 * the trigger cleanupSessions (harmless), and the setup functions in Setup.gs, and each of those
 * setup functions first calls assertOwner_() so that only the owner can run them.
 *
 * Reply shape: { ok: true, data } or { ok: false, message, code }.
 * Public calls: publicConfig, register, login. Everything else needs payload.token.
 */
function apiCall(fn, payload) {
  try {
    return { ok: true, data: Api_dispatch_(String(fn), payload && typeof payload === 'object' ? payload : {}) };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, message: e.message, code: e.code };
    console.error(String((e && e.stack) || e)); // never log payloads: they contain passwords
    return { ok: false, message: 'Something went wrong on the server. Please try again.', code: 'server' };
  }
}

function Api_dispatch_(fn, p) {
  switch (fn) {
    case 'publicConfig':
      return { inviteRequired: Auth.inviteRequired() };
    case 'register': {
      var r = Auth.register(p);
      return Profile.bootstrap(r.userRow, r.token);
    }
    case 'login': {
      var l = Auth.login(p);
      return Profile.bootstrap(l.userRow, l.token);
    }
  }

  var user = Auth.authenticate(p.token);
  switch (fn) {
    case 'session': return Profile.bootstrap(user, p.token);
    case 'logout': Auth.logout(p.token); return { done: true };
    case 'saveOnboarding': return Profile.saveOnboarding(user, p);
    case 'saveGoals': return Profile.saveGoals(user, p);
    case 'saveSettings': return Profile.saveSettings(user, p);
    case 'placementStart': return Placement.start(user);
    case 'placementAnswer': return Placement.answer(user, p);
    case 'placementWriting': return Placement.submitWriting(user, p);
    case 'placementSpeaking': return Placement.submitSpeaking(user, p);
    case 'overview': return Progress.overview(user);
    case 'planEnrich': return Plan.enrich(user);
    case 'wordGloss': return Words.gloss(user, p);
    case 'wordsToday': return Words.today(user);
    case 'wordsSubmit': return Words.submit(user, p);
    case 'wordsList': return Words.list(user, p);
    case 'wordsCheckStart': return Words.checkStart(user);
    case 'wordsCheckSave': return Words.checkSave(user, p);
    case 'ttsAudio': return Tts.audio(user, p);
    case 'wordsRound': return Words.round(user, p);
    case 'wordsReview': return Words.reviewSet(user);
    case 'wordsExtras': return Words.extras(user, p);
    case 'wordsSentence': return Words.sentence(user, p);
    case 'wordsKnow': return Words.know(user, p);
    case 'wordsStudyAgain': return Words.studyAgain(user, p);
    case 'wordsDeck': return Words.deck(user, p);
    case 'wordsPractice': return Words.practice(user, p);
    case 'wordsQuick': return Words.quick(user, p);
    case 'saveWord': return Saved.save(user, p);
    case 'savedList': return Saved.list(user, p);
    case 'savedRemove': return Saved.remove(user, p);
    case 'savedSubmit': return Saved.submit(user, p);
    case 'practiceStart': return Practice.start(user, p);
    case 'practiceAnswer': return Practice.answer(user, p);
    case 'practiceSubmit': return Practice.submit(user, p);
    case 'historySave': return History.save(user, p);
    case 'historyList': return History.list(user, p);
    case 'historyGet': return History.get(user, p);
    case 'grammarHome': return Grammar.home(user);
    case 'grammarLesson': return Grammar.lesson(user, p);
    case 'grammarJudge': return Grammar.judge(user, p);
    case 'grammarRead': return Grammar.read(user, p);
    case 'grammarFree': return Grammar.free(user, p);
    case 'grammarSubmit': return Grammar.submit(user, p);
    case 'drillStart': return Drill.start(user, p);
    case 'drillFinish': return Drill.finish(user, p);
    case 'convStart': return Conv.start(user);
    case 'convAnswer': return Conv.answer(user, p);
    case 'members': return Social.members(user);
    case 'socialBadge': return Social.badge(user);
    case 'msgThreads': return Social.threads(user);
    case 'msgThread': return Social.thread(user, p);
    case 'msgSend': return Social.send(user, p);
    case 'msgReact': return Social.react(user, p);
    case 'tagSend': return Social.tag(user, p);
    case 'cmFeed': return Social.feed(user, p);
    case 'cmPost': return Social.post(user, p);
    case 'cmCreate': return Social.create(user, p);
    case 'cmComment': return Social.comment(user, p);
    case 'cmLike': return Social.like(user, p);
    case 'cmCommentLike': return Social.likeComment(user, p);
    case 'cmVote': return Social.vote(user, p);
    case 'cmReveal': return Social.reveal(user, p);
    case 'cmRemove': return Social.remove(user, p);
    case 'cmHide': return Social.hide(user, p);
    case 'cmNotifs': return Social.notifications(user);
    case 'topicAdmin': return Social.topicAdmin(user);
    case 'topicEdit': return Social.topicEdit(user, p);
    case 'topicPublish': return Social.topicPublish(user);
    default: throw new AppError('Unknown request.');
  }
}
