import re,csv,collections,pickle
POSP=r'(?:modal v\.|auxiliary v\.|indefinite article|definite article|infinitive marker|ordinal number|number|noun\.|n\.|v\.|adj\.(?:/adv\.)?|adv\.(?:/adj\.)?|prep\.|pron\.|conj\.|det\.(?:/pron\.|/number)?|exclam\.)'
LV=r'(?:A1|A2|B1|B2|C1|C2)'
ent=re.compile(r'^(?P<hw>.+?)\s+(?P<rest>'+POSP+r'.*)$')
grp=re.compile(r'\s*(.+?)\s+('+LV+r')(?:,|$)')
def cells(line):
    return [(m.start(),m.group().strip()) for m in re.finditer(r'\S+(?: \S+)*',line)]  # split on 2+ spaces via single-space joins
def parse(path,lst):
    lines=[l.rstrip('\n') for l in open(path,encoding='utf8')]
    skip=lambda l:(not l.strip()) or 'Oxford University Press' in l or l.startswith('The Oxford') or l.startswith(('it includes','As well'))
    L=[(i,cells(l)) for i,l in enumerate(lines) if not skip(l)]
    consumed=set(); rows=[]; bad=[]; fixed=[]
    for li,(i,cs) in enumerate(L):
        for ci,(off,txt) in enumerate(cs):
            if (i,off) in consumed: continue
            full=txt
            if not re.search(LV+r'$',full):
                # wrapped: look at next line for cell near same offset
                if li+1<len(L):
                    for off2,t2 in L[li+1][1]:
                        if abs(off2-off)<=10 and (i+1,off2) not in consumed and re.match(r'^(?:'+POSP+r'|'+LV+r')',t2):
                            full=full+' '+t2; consumed.add((L[li+1][0],off2)); fixed.append(full); break
            m=ent.match(full)
            if not m: bad.append(full); continue
            gs=grp.findall(m['rest'])
            if not gs: bad.append(full); continue
            for pos,lv in gs:
                rows.append(dict(word=m['hw'].strip(),pos=pos.strip().rstrip(',').replace('noun.','n.'),level=lv,list=lst))
    return rows,bad,fixed
r3,b3,f3=parse('bc315b21-The_Oxford_3000.txt','oxford3000')
r5,b5,f5=parse('3cc7ee6a-American_Oxford_5000.txt','oxford5000_extra')
print('3000: rows',len(r3),'headwords',len({r['word'] for r in r3}),'bad',b3); print('wrapped fixed',f3)
print('5000x: rows',len(r5),'headwords',len({r['word'] for r in r5}),'bad',b5); print('wrapped fixed',f5)
for n,r in (('3000',r3),('5000x',r5)): print(n,sorted(collections.Counter(x['level'] for x in r).items()))
print(sorted(collections.Counter(x['pos'] for x in r3+r5).items(),key=lambda t:-t[1])[:40])
# sanity: headwords w/ odd chars
odd=[r['word'] for r in r3+r5 if not re.match(r"^[A-Za-z][A-Za-z0-9 '’\-\.\(\)/]*$",r['word'])]; print('odd',odd[:20])
pickle.dump((r3,r5),open('rows.pkl','wb'))
