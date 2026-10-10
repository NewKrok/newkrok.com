# Hosszú Őrség (angolul: *The Long Watch*)

Külső nézetes (TPS) bázisvédő-túlélő akciójáték böngészőre, asztali
gépre, billentyűzettel és egérrel vagy gamepaddel. Komolyabb hangvételű
sci-fi: rovarszerű idegen faj, egy ostromlott bányászkolónia egy
porhold felszínén. Kidolgozott low poly világ, ugyanazon a stacken, mint
a Dream Fixer.

> Egy mondatban: tartsd a kolóniát, amíg a Hosszú Őrség ideér: öt
> percenként jön egy hullám, köztük ki kell menned nyersanyagért, és a
> huszadik perc után a föld alól előbújik a Kaptárőr.

**Állapot:** a játékmód (ostrom, lásd 3–4.) épül; a korábbi, hosszú
sztorikampány ki lett dobva (a 8. fejezet mondja, miért). A pálya, a
bogarak, a ranger és Kessler onnan jönnek.

---

## 1. Hangnem és stílus

- **Hangulat:** komolyabb sci-fi, de nem horror és nem véres. Fáradt
  veteránok, eltitkolt igazság, nagy tétek, egy kis száraz humor a
  rádióforgalomban.
- **Ellenfelek:** a legyőzött bogarak összeesnek, a lábuk behúzódik, és
  elporladnak. Vér helyett világító, savzöld nedv.
- **A játékos elesik:** földre kerül; ha egy védő elér hozzá, felsegíti
  (körülbelül 2,5 mp). Kint a pályán 10 mp vérzés után a bázison éled
  újra 50% élettel, és a nála lévő kristály fele ott marad a földön.
- **Vizuális stílus:** kidolgozott low poly, flat shading, vertex colorok,
  a Synty-csomagok részletességével: tömzsi, lekerekített élű lemezek,
  kevés, erős színnel, nagy kezekkel és bakancsokkal, olvasható arcokkal.
  A Porfészek-hold rozsdavörös por egy gyűrűs gázóriás alatt. A Kaptár
  elemei (bogarak varratai, szemek, zsákok, sav) világítanak, ezekre fog a
  bloom.
- **A rangerek páncélja:** Gears of War és Buzz Lightyear keveréke: nehéz,
  tagolt mellvért, nagy vállpáncél, térdvédők, szegmentált has; fehér (Hetes)
  vagy kopott szürkészöld (Kessler) héj, lime és lila (vagy narancs és
  acélkék) sávokkal, mellkasi panel gombokkal, nyakgallér, szárnytáska a
  háton, nyitott sisak buborékvizorral, amin át látszik az arc. A tartalék
  fegyver a háton (hosszú fegyver) vagy a comb tokjában (pisztoly) lóg.
- **A bogarak:** bogárszerűek, a WoW silithidjeinek mintájára: nagy,
  kupolás, középen gerinccel kettéosztott szárnyfedő sötét tigriscsíkos
  mintával, alá tűrt, gyűrűs potroh, kis szarvas fej alacsonyan elöl,
  pengeszerű lábak fogazott úszóval és hegyes lábvéggel, a nagyokon
  kasza-mellső végtag. Típusonként más a páncél színe: a rajzó rozsdás
  narancs, a köpködő türkiz, a rohamozó mélylila arany szegéllyel és nagy
  homlokszarvval, az őrszem lila, a Kaptárőr sötétlila arannyal.
- **Hang:** a zajok és a zene szintetizáltak (`src/audio.js`). A szereplők
  angol hangja ElevenLabs-szal készül (`scripts/voice.mjs`), minden nyelven
  angolul; a felirat a választott nyelven jelenik meg. Aki a hajóról
  beszél, rádión szól (szűrt sáv, zörej, squelch), Kessler sisak-rádión
  (tisztább). Amíg nincs legenerált hangfájl, a sor csak feliratként
  jelenik meg. A rádió rövid, egymondatos: hullámjelzés, boss, lőszer,
  elesés, a bázis állapota.

## 2. Szereplők

| Ki | Szerep | Hang |
| --- | --- | --- |
| **Te, „Hetes” (Seven)** | Néma ranger. Páncélos, sisakos figura, külső nézetből. Egyedül jár ki a bázisról. | – |
| **Mara Kessler őrmester** | Tapasztalt ranger, a bázis parancsnoka: a reaktor mellett tart ki, a hullámokat ő és két ranger veri vissza veled. A rádión ő szól a helyszínen. | ElevenLabs |
| **Két ranger (Ruiz, Okafor)** | A bázis másik két védője. Nem beszélnek. | – |
| **Idris Oduya parancsnok** | A Hosszú Őrség parancsnoka, a rádióhang: hullámjelzés, a boss, az eredmény. | ElevenLabs |
| **Dr. Lena Voss** | Xenobiológus a hajón, a bogarakról és a repülőről beszél. | ElevenLabs |

## 3. Keret

A Porfészek-hold Deepcore-kolóniája ostrom alatt áll: a bánya áttört egy
üregbe, és felébredt a **Kaptár**. A kolóniából egy reaktor, három
ranger és te maradtatok. A Hosszú Őrség úton van, de a Kaptár előbb ér
ide: a huszadik percben a fészek a **Kaptárőrt** is felküldi. Ennyi a
történet; nincs kampány, átvezető és adatlap. A rádió egy-egy mondatot
mond, a többit a hullámóra.

## 4. Játékmenet

### A kör

- **A bázis:** a kolónia közepe. A **reaktor** a tér közepén áll, van
  életereje; ha elfogy, vége a futamnak. Mellette az **ellátó
  terminál** (a bolt). Kessler és két ranger a reaktor körül tart ki,
  nem követnek. Egy kisebb hullámot ők is elbírnak, a nagyokhoz te
  kellesz.
- **Hullámóra:** a HUD-on állandó visszaszámláló. Hullám 5, 10, 15 és
  20 perckor, 45 mp-cel előtte figyelmeztetés rádión. Egyre nagyobbak:
  rajzók, köpködők, a harmadiktól rohamozók, több lyukból egyszerre; a
  reaktort támadják, de aki az útjukba kerül, azt is.
- **A két hullám között** mész ki: ládák véletlen tartalommal (lőszer,
  kristály, egy-egy fejlesztő), őrjáratok, a menekülő repülő, fegyverek.
  A **kristály** a nyersanyag: a bogarakból, a ládákból és a repülőből
  esik, odamenve felveszed. Csak a bázisra visszaérve kerül a kasszába.
- **A bázison:** a terminálnál kristályért: gyógyulás, lőszer,
  fegyverfejlesztés (sebzés, tár), saját fejlesztés (élet, pajzs,
  sebesség), reaktorjavítás, torony.
- **A Kaptárőr:** a 20. perc hulláma után véletlen helyen, a bázistól
  legalább 100 m-re bújik elő a földből, és lassan indul a reaktor felé
  (kb. 3 perc az út). Elé mész, vagy a bázisnál várod. Ha meghal: az
  eredmény (idő, hullámok, ölések, kristály), és a futam **végtelen
  módban** megy tovább: négypercenként hullám, minden harmadikkal egy
  újabb, erősebb Kaptárőr. Ranglista: a túlélt idő.
- **Ha elesel:** ha egy védő a közeledben van, felsegít. Különben 10 mp
  vérzés, aztán a bázison éledsz újra 50% élettel, pajzs nélkül, a nálad
  lévő kristály fele a halál helyén marad egy jelölővel (vissza lehet
  menni érte). Hullám közben ez súlyos.
- **Kezdés:** a reaktor mellett, karabéllyal és pisztollyal.

### Harc

- **Pörgős és ugrálós:** vállkamerás célzás (jobb klikk / LT ráközelít),
  ugrás, futás, **kitérés** (dash, rövid sérthetetlenséggel, levegőben
  egyszer), lövés mozgás közben, vállcsere.
- **Fedezék:** egy gombbal a legközelebbi falhoz vagy korláthoz tapadsz. A
  fal mentén csúszol; alacsony fedezékből célzáskor felemelkedsz és lősz,
  magas fedezék szélén kihajolsz. Alacsony fedezéken ugrással átvetődsz.
  Ha elhúzod a kart a faltól, kilépsz. Harci eszköz, nem rejtőzés.
- **Két fegyver:** egyszerre csak kettő lehet nálad. Fegyverállványnál
  vagy egy földön heverő fegyvernél cserélsz. Ugyanolyan fegyvernél a
  lőszerét veszed el.

| Fegyver | Jellemző |
| --- | --- |
| **P9 oldalfegyver** (pisztoly) | Végtelen tartalék, pontos. |
| **AR-7 karabély** (géppuska) | Automata, a fő fegyver. |
| **GL-4 gránátvető** | Íves lövedék, területi sebzés; a műveleti központ fegyvertárában. |
| **Lándzsa lézer** | Folyamatos sugár, nincs tár, de túlhevül; a nyugati gerincen, egy Deepcore-ládában. |

Lőszer: a boltban, lőszerládákban a pályán, és a pályán heverő
fegyverekből.

### Érzékelés

A bogarak **látnak és hallanak**. Nincs lopakodás.

- Látás: nyitott terepen 20–30 m-ről, széles kúpban; közvetlen közelről
  mindenképp. Fal mögül nem.
- Zaj: a lövés és a futás messzire hallatszik; aki hall valamit,
  odamegy megnézni, aki rád talál, vadászni kezd, és a közelieket is
  riasztja.
- Sehol nincs nyugalom: a lyukakból folyamatosan **őrjáratok** jönnek,
  amik két pont között vándorolnak a pályán.

### Bogártípusok

| Típus | Viselkedés | Gyenge pont | Kristály |
| --- | --- | --- | --- |
| **Rajzó** | Kicsi, gyors, tömegesen jön, harap, az utolsó métereket ugrással teszi meg. | fej | 3 |
| **Köpködő** | Távolságot tart, íves savat köp, ami tócsát hagy. | a hátán világító zsák | 7 |
| **Páncélos rohamozó** | Elölről páncélos, nekifut és egyenesen rohamoz; ha falnak megy, elkábul. | hát, és kábultan bármi | 18 |
| **Repülő (szedő)** | Nem támad. A pálya fölött köröz, ha közeledsz, menekül; ha leszeded, sok kristályt ad. | – | 60 |
| **Kaptárőr** (boss) | Lásd lent. | 3 zsák, és a nyitott szája | 120 |
| *Őrszem* | A régi módból maradt (lát és riaszt); az ostromban nem jön. | fej | – |

- **Kaptárőr:**
  - Csak a három világító zsákja és a nyitott szája sebezhető rendesen;
    a szája akkor nyílik ki, amikor üvölt, köp vagy rohamra készül.
  - Egy zsák szétlövése megtántorítja.
  - 1. fázis: csapás közelről, savzápor, roham (ha falnak megy, elkábul).
  - 2. fázis: ezen felül bogarakat hív a lyukakból.
  - 3. fázis: gyorsabb, ráugrik a célpontjára, és a becsapódás lökéshulláma
    gyűrűként terjed (át kell ugrani).
  - A reaktorhoz érve azt üti.

### A védők (Kessler és a két ranger)

- **Nem irányíthatók.** Mindegyiknek van egy posztja a reaktor körül,
  azon belül mozognak, fal mellé húzódnak, és mindenre lőnek, ami 40
  m-en belül jön; a páncélosoknak a hátát célozzák.
- Felsegítenek, ha a közelükben estél el. Ha őket ütik ki, 12 mp múlva
  felállnak: nem lehet elveszíteni őket.

### A pálya

A régi Porfészek-hold, 320 × 320 m: a kolónia középen (bázis), a
leszállóhely délen, a gerinc nyugaton, a kanyon északon, a gödör
keleten. A lyukak (ahonnan a hullámok és az őrjáratok jönnek) egy
gyűrűben vannak a bázis körül 70–80 m-re, plusz a régi, távolabbiak.

### Később

- Meta-fejlődés futamok között (csak halálkor vagy győzelemkor kapott
  pont, állandó fejlesztésekre): ha a kör stabil.
- Ranglista a túlélt időre, a Hitch & Park infrájával.
- Tornyok és több védő a boltban, ásók, újabb pálya.

## 5. Platform és vezérlés

- **Asztali gép:** billentyűzet és egér, illetve gamepad (a Dream Fixer
  `gamepad.js`-e és `padnav.js`-e, menük fókuszmozgatással).
  - **Billentyűzet:** WASD, egér, bal klikk tűz, jobb klikk célzás, Szóköz
    ugrás, Shift futás, V kitérés, C / Ctrl guggolás, Q fedezék,
    R újratöltés, E használat, 1 / 2 / görgő / Tab fegyvercsere, X vállcsere,
    Esc szünet.
  - **Gamepad:** bal kar mozgás (benyomva futás), jobb kar nézés (benyomva
    vállcsere), RT tűz, LT célzás, A ugrás, B kitérés, X használat vagy
    újratöltés, Y fegyvercsere, RB fedezék, LB guggolás, Start szünet.
    Célzássegítés: a nézés lelassul bogár fölött.
- **Mobil:** most nincs rá fókusz.
- **Nyelvek:** angol és magyar. A többi oldalnyelv (de, es, fr, zh) akkor
  jön, ha a szövegek véglegesek.
- **Nehézség:** Újonc / Ranger / Veterán (a kapott sebzés és a bogarak
  életereje).

## 6. Technikai felépítés

| Fájl | Feladat |
| --- | --- |
| `sim/terrain.js`, `sim/space.js` | Magasságmező-terep (2 m-es cellák) és a Dream Fixer dobozos-hengeres világa együtt: sugarak, padló. |
| `sim/body.js` | A Dream Fixer testmozgása, terepre, lejtőkorlátra és kitérésre bővítve. |
| `sim/player.js`, `sim/camrig.js` | A ranger: mozgás, fedezék, fegyverek, zaj, fejlesztések (sebzés, tár, élet, pajzs, sebesség); a vállkamera a szimulációban is ki van számolva. |
| `sim/ally.js` | A védők: poszt körül, fedezékben, lőnek, felsegítenek. |
| `sim/core.js` | A reaktor: életerő, a bogarak célpontja. |
| `sim/bugs.js`, `sim/warden.js` | A Kaptár (látás, hallás, őrjárat, a reaktor ostroma) és a boss (menetelés a bázisra). |
| `sim/nav.js` | 2 m-es járásrács, távolságmező célpontonként (Dijkstra). |
| `sim/run.js` | Egy futam: lépés, zajok, hullámok, lövedékek, kristály, bolt, újraéledés. |
| `levels/dustmoon.js` | A Porfészek-hold terepe és épületei, a bázis, a lyukak. |
| `levels/siege.js` | Az ostrom forgatókönyve: hullámóra, őrjáratok, ládák, repülő, boss, végtelen mód, pontszám. |
| `render/…` | Égbolt gázóriással, terep- és pályamodellek darabokban, effektek. |
| `render/models/characters.js` | A ranger (ízelt váz), az arc, a fegyverek; `render/rangerfig.js` a procedurális animáció. |
| `render/models/bugs.js` | A Kaptár modelljei. |
| `viewer.js` | Fejlesztői modellnéző (`?model=…`), a ranger pózaival. |
| `hud.js`, `ui/menus.js` | DOM-alapú HUD (hullámóra, reaktor, kristály) és menük (cím, szünet, bolt, eredmény). |
| `story/director.js`, `voice.js` | Ki beszél, mikor; a hangok rádiós láncon. |

- A szimuláció fix 60 Hz-en fut, renderfüggetlen. Egy futam egy Run;
  nincs ellenőrzőpont és mentés.
- A távoli, nyugodt bogarak csak minden negyedik lépésben frissülnek.
- `npm run dev -w games/long-watch` (port 5360).
- `node scripts/siege.mjs [perc] [seed]`: fej nélkül, isten mód nélkül
  végigjátssza a futam első perceit egy bottal, és kiírja hullámonként a
  reaktor életét, a leütéseket, a kristályt.
- `node scripts/shot.mjs <előtag> x,z,yaw,pitch …`: képernyőképek.
- `node scripts/models.mjs <mappa> <modell|all> [query …]`: modellek képei
  a nézőből (`?model=ranger&pose=reload&k=0.5&skin=kessler&yaw=-2.3`).
  - Mindkettőhöz `PLAYWRIGHT_CORE` és (ha nem a szokásos helyen van)
    `CHROME` kell.
- `npm run voice -w games/long-watch`: a hangok legenerálása (ElevenLabs
  kulcs az `elevenlabs.txt`-ben vagy `ELEVENLABS_API_KEY`-ben); a
  szereplők hangja és a színészi utasítások a `scripts/cast.mjs`-ben.

## 7. Nyitott kérdések

- A meta-fejlődés tartalma és a ranglista (túlélt idő) bekötése.
- Tornyok, több védő, ásók; egy második pálya.
- A szereplők végleges ElevenLabs-hangjai.
- A többi nyelv.

## 8. Átadás: állapot és tudnivalók a folytatáshoz

**Miért lett új a játék:** a felhasználó a 3. menet után úgy döntött,
hogy a hosszú sztori keveseket érdekelne, és a játékot bázisvédő-túlélő
körre építi át (lásd 3–4.). A döntései: egyedül vagy kint (Kessler a
bázison marad), a fedezék marad, meta-fejlődés később (csak halálkor
vagy győzelemkor), elesésnél 10 mp és 50% élet, a boss után végtelen mód
és ranglista. A sztori szkriptje, az ellenőrzőpontok, a lopakodás, az
őrszemek szerepe és az adatlapok kikerültek.

**Hol tart:** a `claude/eager-fermi-2sst54` ágon, a főágba még nincs
beolvasztva. Kipróbálni helyben:

```sh
npm install                          # egyszer, a repo gyökeréből
npm run dev -w games/long-watch      # http://localhost:5360/
```

A modellnéző ugyanitt: `http://localhost:5360/?model=ranger&pose=aim`.

**Hol tart a mód (4. menet):** a kör végigjátszható: reaktor és három
védő a téren, hullámóra (5 percenként, 45 mp figyelmeztetés), hullámok
a bázis körüli nyolc gyűrű-lyukból (`ring1…8`), őrjáratok a távoli
lyukakból (max. 52 élő bogár), ládák (kristály / lőszer / nagy
kristály), a menekülő repülő (`skimmer`, 75 mp-ig él), a Kaptárőr a 4.
hullám után véletlen helyről a reaktorra menetel, végtelen mód a boss
után (4 percenként hullám, minden harmadikkal új, +25% életerejű
Kaptárőr), bolt (ellátás, lőszer, reaktorjavítás, sebzés, tár, páncél,
pajzs, lábak), újraéledés 10 mp után 50% élettel, a kristály felét
hátrahagyva, eredményképernyő pontszámmal (idő + 2·ölés + kristály).
Hullám n: 10+5n rajzó, n+1 köpködő, ⌊n/2⌋ rohamozó (a 2.-tól). A
reaktor felé tartó bogár 7 m-en belül (köpködő 4) vált élő célpontra,
és rátámad arra, aki 18 m-en belülről meglövi. A bot (`siege.mjs`, 16
perc, 3 hullám, fejlesztés nélkül): az 1–2. hullám veszélytelen, a 3.
a reaktort 1486-ról 641-re vitte, a botot háromszor ütötték le; 263
kristályt gyűjtött. A 4. hullám és a boss fejlesztés nélkül durva lesz:
a felhasználó kipróbálása dönt (állítható: a védők sebzése 7/lövés,
életük 120; a hullámméret; a reaktor 1500; a bolt árai). A Kaptárőr
menetelése 1,1 m/s, 22 m-en belül teljes tempó. Még nincs: torony,
ranglista, meta-fejlődés. A `sentry` típus a kódban maradt, az ostrom
nem hívja.

**5. menet (a felhasználó első játékteszt-visszajelzése után):** stamina
(sprint és kitérés költi, a HUD-on csík; `PLAYER.stamina*`), a rajzók
lassabbak (6,3) de nagyobbat ugranak és harapás vagy ugrás után
megtorpannak (`recover`), a bogarak ütköznek egymással és a rangerekkel
(`bugs.js` szétlökés + `run.js` a játékost tolja ki), a zajkör
kikerült. A bázis állomásai a reaktor körül (`dustmoon.js` jelek,
`siege.js` STATIONS/SHOP): gyengélkedő (ingyen, 60 mp), lőszerraktár
(lőszer, tölténytáska), fegyvertár (gránátvető, lézer), műhely (sebzés,
tár, páncél, pajzs, lábak), drónállomás (támogató, lőszer, támadó,
felderítő; `sim/drones.js`, a játékos két oldalán lebegnek),
parancsnoki poszt (reaktorjavítás, +2 ranger a `postExtra` jeleknél,
4 torony a `turret1…4` jeleknél). Minitérkép a HUD jobb felső sarkában
(`hud.js #drawMap`: a terep színei egyszer kisütve, 150 m-es ablak,
észak fent; állomások betűvel, Kaptárőr mindig, bogarak és zsákmány a
felderítő drónnal). Pálya: dombok és hat mesa (`MESAS`), a keletiben
fedett átjáró (`PASSAGE`, tetőblokkok lámpával), sziklacsoportok,
kősorok, monolitok; a magasságmező 1 m-es (volt 2), a talaj osztott
csúcsokkal, a mező saját normáljaival (varrat nélkül) és csempézett
porszemcse-textúrával (`levelview.js groundTexture`). Még nincs: ásó,
új pálya, ranglista.

**6. menet (a második játékteszt hét pontja):**
- *Új pálya* (`dustmoon.js`, 480 × 480 m, a régi 320-as helyett): a bázis
  változatlan, a terep újraírva. Szelíd síkság (`plain()`, legfeljebb
  ~16°), rajta a tereptárgyak: pit keletre (150, 10), relé-gerinc
  nyugatra (−165, −34) ösvénnyel, északon a kanyon már csak egy
  masszívumon vezet át (`massif`, a plató két oldalt visszasimul a
  síkba) a bunkerig (−32, −190), északkeleten kráter a lezuhant
  dropshippel (`WRECK`, benne gránátvető-állvány), délkeleten kiszáradt
  tómeder (`LAKE`, r 45) elhagyott felmérőtáborral, délnyugaton dűnék
  (`dunes()`), kis kráter roverrel, nyolc mesa, kettőre ösvény vezet
  (`MESA_TRAILS`, a tetejükön lőszer). A fedett átjáró (barlang)
  kikerült: tetőblokkjai a mesa oldalába temetve láthatatlan falak
  voltak. 12 fix lőszerkészlet (`ammo1…12` jelek, 90 mp újratöltés),
  25 odú (8 gyűrű + 17 távoli).
- *Állomások szétszórva* (`STATION_SPOTS`): gyengélkedő (−22, 29),
  lőszerraktár (31, −14), fegyvertár (−31, −12), műhely (26, 35),
  drónállomás (4, 27), parancsnoki poszt (0, −10). Mindegyiknél
  jelzőoszlop (`beacon` modell) saját színnel, ugyanezek a színek a
  minitérképen (nagyobb betűk) és a terepen lebegő feliratokon
  (`hud.js .stations`, 80 m-ig, célzáskor eltűnnek). A rögzített
  készletek és állványok is látszanak a minitérképen.
- *Ládák*: 35 % kristály, 30 % lőszer (tartalék +60 %, tárak tele),
  20 % fegyver (gránátvető vagy lézer, amelyik még nincs; a láda mellé
  kerül, E-vel cserélhető), 15 % nagy kristály. 30 mp-enként, max. 16.
- *Nincs bank*: a felvett kristály azonnal `run.bank`-ba kerül
  (`run.crystals` megszűnt), halálkor nem veszik el semmi. A HUD egy
  számot mutat.
- *Útkeresés*: a rács nyitott cellája 39°-nál laposabb (volt 57°),
  lépcső 1,1 m (volt 1,3), a bogarak teste 36°-nál meredekebbre nem megy
  fel (`climb: 0.72`, a ranger 51°-ot bír). Új „alacsony" cellaréteg
  (`open = 2`): 1,35 m-nél nem magasabb akadály (korlát, láda); a rajzók
  mezője (`+j` kulcs) átmegy rajta (+5 m költség), és ha falnak feszülnek
  (`blockT` > 0,3 mp), átugorják (`#lowAhead`, `hop`). A többi bogár
  ilyenkor 2–3 mp-re a mezőt követi az egyenes helyett (`detourT`). Az
  egyenes vonalhoz már a talajnak is járhatónak kell lennie
  (`nav.straight`). A mezők gyorsítótára 48 darabra korlátozva (LRU).
- *Fedezék-kamera*: fedezékben a kamera a faltól távolabbi váll fölé
  megy (`player.js`, a `shoulder` a fal normálisából), és ha a választott
  oldalon nincs hely, a rig magától a másik vállat választja
  (`camrig.js`); fedezékben célzás nélkül 0,3 m-rel feljebb és kijjebb
  (`CAMERA.coverRaise/coverSide`).
- *Láthatatlan ütközők*: a sziklák hengere a kő talajszinti kerületéhez
  igazodik (rock 1,25·s, volt 1,6·s; rockLow 1,3·s), mert a gömbforma
  a derekánál a legszélesebb, a lábnál keskenyebb, és a régi henger
  ebbe a résbe akasztott be. A dev fogantyú `colliders()` hívása
  lila drótvázként mutatja az ütközőket, a `nav()` a rács tiltott
  (piros) és ugorható (sárga) celláit.

**Ellenőrzés minden változtatás után** (`npm run dev -w games/long-watch`
mellett): `node scripts/siege.mjs 11` (két hullám és a köztes kijárás;
a reaktor nem eshet 0-ra, a bot 0–2 leütést kaphat), és a
`?model=…` néző a figurákhoz. A fej nélküli szkriptekhez a gépen a
`PLAYWRIGHT_CORE` alapértelmezése (`~/work/nape-js/...`) jó, a `CHROME`
pedig `~/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`.
A Claude beépített böngészője gyorsabb a képekhez, de ha egy másik chat
dev szervere fut az 5360-on, nem engedi be: ilyenkor a fej nélküli
Chromium marad (egy felülnézeti kép: a játékost 420 m magasra tenni,
pitch −1,52, a ködöt kitolni). A dev fogantyú (`window.__longWatch`):
`play()`, `place(x,z,yaw,pitch)`, `steps(n, I)`, `god()`, `freeze()`,
`warp(mp)` (a hullámóra előretekerése), `colliders(on)`, `nav(on)`.

**A figurák (3. menet, Synty-irány):** a felhasználó első visszajelzése a
2. menetre: a kezek a testben voltak, és az egész figura dobozokból állt.
A 3. menet ezért a ranger modellt teljesen újraépítette esztergált
(lathe) formákból: lekerekített, tízlapú tagok (`pod`), kupolák (`dome`),
bordázott puhaöltözet az ízületeknél (`ribs`), egy darabból esztergált
mellvért, kupola-vállpáncél, gömbsisak (hátul kemény héj, elöl
üvegbúra, perem a találkozásnál, belül tükrözött bélés, hogy ne lássunk
át rajta). A fegyverállások (`POSE` a rangerfig.js-ben) előrébb kerültek,
a mellvért elé (ready z = −0,3; a mellvért eleje ≈ −0,2), a kar 0,61 m-re
nőtt (`RIG.upper` 0,31, `fore` 0,3). A vállpáncél lapított (y 0,72), mert
a célzókamera fölötte néz a puskára. Ami megmaradt a régiből: az arc, a
kezek (dobozok), a fegyverek és a túlélők. Egy ranger a négy fegyverével
kb. 10 ezer háromszög, 42 mesh.

**A bogarak (3. menet):** a felhasználó silithid-képeket mutatott (WoW),
ilyet kért Synty-stílusban. A `models/bugs.js` teljesen új: `shell()`
(kupola, sötét perem, gerinc és tigriscsíkok tóruszívekből, a sátor
`at()` keretében skálázva), `abdomen()` (bevágott esztergált potroh, +y →
+z forgatva), `head()`, `leg()` fogazott úszóval (`fin()`), a rohamozón és
a Kaptárőrön kaszapenge (`S.extrude`). A csomópontnevek (body, head, l0…,
sac, frill, jaw, sacL/R/T) és a találati gömbök (`sim/bugs.js`,
`sim/warden.js`) változatlanok, a formák azokba illeszkednek.

**Tanulságok, amikre figyelni kell:**
- A képkocka-idő negatív is lehet (az első rAF-nál); a `game.js` lenullázza.
  Negatív `dt`-vel a `damp` elszáll (kamera, FOV).
- Ha egy szereplő lépései zajosak, az a lopakodást is tönkreteszi: Kessler
  csak harcban lehet hangos, és lopakodáskor kerüli a nem riasztott
  bogarakat.
- A használati pontok magassága a terepből jön (`run.addUse`), nem a
  kellékek tetejéből. Lejtőn álló kelléknél ez számít.
- Ha új épületet teszel a terepre, simítsd el alatta a magasságmezőt
  (lásd a bunkert a `dustmoon.js`-ben), különben a terep átdöf a padlón.
- A ranger rigje a `RIG` (characters.js): a vállak és a karhosszak ott
  vannak; a fegyverállások (`POSE`, `AIM` a rangerfig.js-ben) a törzs
  terében értendők, és a bal kéz csak kb. 0,61 m-re ér a válltól: ha egy
  új állásban a kéz nem éri el a fogáspontot, közelebb kell hozni a
  fegyvert, nem a kart nyújtani. A nézőben (`?model=ranger&pose=…`) lehet
  ellenőrizni. Egy állás z-je a mellvért elé (< −0,22) kell essen,
  különben a kéz a testben van; az alacsony készenlétben a puska erősen
  balra és lefelé fordul (ry ≈ 0,95, rx ≈ −0,75), csak így éri el a bal
  kéz az előagyat.
- Esztergált (lathe) test: a `FACE` elforgatás kell, hogy a −z felé egy
  lap nézzen, ne egy él. Egy nyitott héj belseje nem látszik (hátlapok):
  ha át lehet látni rajta, tükrözött (`s: [-1, 1, 1]`) példány kell
  belülre.
- A fegyvercsere és az újratöltés animációját a sim `swapT` és `reloadT`
  számlálója hajtja (a figura `reloadK`-t és `swapT`-t kap); a csere felénél
  vált a kézben lévő modell, a szim már az elején.
- Rajzolási hívások: nagyjából 400–500 egy képen, árnyékkal és bloommal
  együtt. Egy ranger kb. 16 csomópont (hívás anyagonként), a bogarak lábai
  külön csomópontok. Nagyobb pályán a statikus darabok mérete (`buildChunks(40)`) és a
  bogarak lábai (árnyék nélkül) a fő emelők.

- A bogarak célpontja bárki lehet, akinek `kind`, `body` (x, y, z, vx,
  vz, r, h), `downed` és `hurt()` van: a játékos, a védők és a reaktor
  (`sim/core.js`). A `run.foes()` adja a listát; új célpontfajtát oda
  kell felvenni, nem a bogarak kódjába.

**Javasolt következő lépések** (a felhasználó kipróbálása után pontosítva):
- egyensúly a bottal és játékteszttel: hullámméret, a reaktor élete, a
  bolt árai, a kristály hozama;
- ládák és a repülő, ha még nincsenek; tornyok;
- ranglista (túlélt idő), utána a meta-fejlődés;
- a bogarak animációja az új modellekhez, a túlélők stílusa (ha
  maradnak), a kezek ujjai;
- hangok legenerálása (`npm run voice -w games/long-watch`, kulccsal);
- Gamer Zone bejegyzés előnézeti képpel, ha már megmutatható.
