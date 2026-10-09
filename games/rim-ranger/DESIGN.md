# Peremőr (munkacím, angolul: *Rim Ranger*)

Történetes, külső nézetes (TPS) akciójáték böngészőre, asztali gépre,
billentyűzettel és egérrel vagy gamepaddel. Komolyabb hangvételű sci-fi:
rovarszerű idegen faj, elhallgató kolóniák, nagy, bejárható bolygófelszínek.
Kidolgozott low poly világ, ugyanazon a stacken, mint a Dream Fixer.

> Egy mondatban: a Peremvidék rangereinek újonca vagy, és bolygóról
> bolygóra visszavered a Kaptárt, míg végül le nem jutsz a fészek mélyére,
> a királynőhöz.

**Állapot:** az 1. fejezet (Porfészek-hold) játszható az elejétől a végéig.
A többi fejezet csak a sztoriívben létezik. A végleges cím még nincs
kiválasztva (a mappa neve, `rim-ranger`, a cím után változhat).

---

## 1. Hangnem és stílus

- **Hangulat:** komolyabb sci-fi, de nem horror és nem véres. Fáradt
  veteránok, eltitkolt igazság, nagy tétek, egy kis száraz humor a
  rádióforgalomban.
- **Ellenfelek:** a legyőzött bogarak összeesnek, a lábuk behúzódik, és
  elporladnak. Vér helyett világító, savzöld nedv.
- **A játékos elesik:** földre kerül, Kessler odaszalad és felsegíti
  (körülbelül 2,5 mp). Ha Kessler is lent van, vagy lejár a 22 mp-es
  vérzési idő, a küldetés az utolsó ellenőrzőpontra áll vissza.
- **Vizuális stílus:** kidolgozott low poly, flat shading, vertex colorok.
  A Porfészek-hold rozsdavörös por egy gyűrűs gázóriás alatt. A Kaptár
  elemei (bogarak varratai, szemek, zsákok, sav) világítanak, ezekre fog a
  bloom.
- **Hang:** a zajok és a zene szintetizáltak (`src/audio.js`). A szereplők
  angol hangja ElevenLabs-szal készül (`scripts/voice.mjs`), minden nyelven
  angolul; a felirat a választott nyelven jelenik meg. Aki a hajóról
  beszél, rádión szól (szűrt sáv, zörej, squelch), Kessler sisak-rádión
  (tisztább), a túlélő élőben. Amíg nincs legenerált hangfájl, a sor csak
  feliratként jelenik meg.

## 2. Szereplők

| Ki | Szerep | Hang |
| --- | --- | --- |
| **Te, „Hetes” (Seven)** | Néma újonc ranger. Páncélos, sisakos figura, külső nézetből. | – |
| **Mara Kessler őrmester** | Tapasztalt ranger, végig veled tart, az MI irányítja. Ő beszél a helyszínen. | ElevenLabs |
| **Idris Oduya parancsnok** | A Hosszú Őrség (*Long Watch*) parancsnoka, a rádióhang. Fáradt veterán. | ElevenLabs |
| **Dr. Lena Voss** | Xenobiológus a hajón. Ő magyarázza a bogártípusokat. | ElevenLabs |
| **Julian Marsh** | A Deepcore Consolidated összekötője. Udvarias, és mindenről tudott. | ElevenLabs |
| **Teo Brandt** | Túlélő műszakvezető a porfészki bunkerben. | ElevenLabs |
| **A Kaptár királynője** | A végső ellenfél, a 6. fejezetben. | – |

## 3. Sztoriív

A Peremvidék a galaxis széle: bányászkolóniák, farmholdak, egy
kereskedőállomás, és nagyon kevés ranger. A kolóniák egymás után
elhallgatnak. A helyszínen kiderül, hogy egy rovarszerű faj rajzott elő a
mélyből: a **Kaptár**.

1. **Porfészek-hold, első kontaktus** (kész, lásd lent). A Deepcore
   bányája áttört egy üregbe a kilences szinten, és felébresztette a
   fészket. A naplókból kiderül, hogy a cég egy éve tudott róla, és Marsh
   titkos csomagot küldött a fagyhatári állomásra.
2. **Jégvilág (Fagyhatár, *Frostreach*), terjedés.** Az 1. fejezet vége
   felvezeti: az állomás nem válaszol.
3. **Dzsungelbolygó, terjedés:** a bogarak összehangoltan mozognak.
4. **Kereskedőállomás, fordulópont:** ostrom és evakuálás; kiderül, hogy a
   fészkeket egy királynő irányítja, és hogy a Deepcore mit akart a
   Kaptárral.
5. **Vulkánhold, felkutatás:** a fő fészek bejárata.
6. **Finálé, a fészek mélye:** a királynő, többfázisú bossharc.

A történet csatornái: rádióforgalom a pálya közben (nem veszi el az
irányítást), Kessler megjegyzései, gyűjthető adatlapok (fejezetenként 5),
átvezetők a játékmotorban (átugorhatók), és később a hub.

## 4. Játékmenet

### Harc

- **Pörgős és ugrálós:** vállkamerás célzás (jobb klikk / LT ráközelít),
  ugrás, futás, **kitérés** (dash, rövid sérthetetlenséggel, levegőben
  egyszer), lövés mozgás közben, vállcsere.
- **Fedezék:** egy gombbal a legközelebbi falhoz vagy korláthoz tapadsz. A
  fal mentén csúszol; alacsony fedezékből célzáskor felemelkedsz és lősz,
  magas fedezék szélén kihajolsz. Alacsony fedezéken ugrással átvetődsz.
  Ha elhúzod a kart a faltól, kilépsz.
- **Két fegyver:** egyszerre csak kettő lehet nálad. Fegyverállványnál
  vagy egy földön heverő fegyvernél cserélsz (a régit leteszed, később
  visszaveheted). Ugyanolyan fegyvernél a lőszerét veszed el.

| Fegyver | Jellemző |
| --- | --- |
| **P9 oldalfegyver** (pisztoly) | Végtelen tartalék, pontos, közepesen hangos. Fejlövéssel egy rajzót vagy őrszemet csendben leszed. |
| **AR-7 karabély** (géppuska) | Automata, a fő fegyver, hangos. |
| **GL-4 gránátvető** | Íves lövedék, területi sebzés, nagyon hangos; a műveleti központ fegyvertárában van. |
| **Lándzsa lézer** | Folyamatos sugár, nincs tár, de túlhevül. Szinte néma: a lopakodás fegyvere. A relénél, egy Deepcore-ládában van. |

Lőszer: lőszerládák a pályán, és a pályán heverő fegyverek.

### Érzékelés és lopakodás

A bogarak **hallanak és tapintanak**, csak az őrszemek látnak.

- Zaj (méterben): guggolás 1,6, séta 6, futás 15, kitérés 11, nagy
  esés 9, lövés fegyverenként (lézer 4, karabély 30). Fedezékben a lépések
  zaja feleződik. Fal mögül a hang rövidebbre jut. A ranger lába körüli
  kör mutatja, meddig hallatszik a zajod.
- Egy bogár, amelyik hall valamit, **odamegy megnézni** („?” jel), amelyik
  rád talál, **vadászni kezd**, és a közelieket is riasztja (csiripelés).
  Ha elég ideig csendben maradsz, elveszít.
- Közvetlen közelről (1,5–3 m) mindenképp megérez.
- **Őrszem:** látókúp, falon nem lát át. A guggolás és a fedezék sokat
  segít. Amíg néz, egy szem telik fölötte; ha megtelik, sikít, és 48 m-es
  körben minden bogarat rád uszít. Halk fegyverrel (lézer, pisztoly-fejlövés)
  egy pillanat alatt leszedhető, mielőtt reagálna.

### Bogártípusok

| Típus | Viselkedés | Gyenge pont |
| --- | --- | --- |
| **Rajzó** | Kicsi, gyors, tömegesen jön, harap, az utolsó métereket ugrással teszi meg. | fej |
| **Köpködő** | Távolságot tart, íves savat köp, ami tócsát hagy. | a hátán világító zsák |
| **Páncélos rohamozó** | Elölről páncélos, nekifut és egyenesen rohamoz; ha falnak megy, elkábul. | hát, és kábultan bármi |
| **Őrszem** | Lát és riaszt, nem támad. | fej |
| **Kaptárőr** (1. fejezet bossa) | Lásd lent. | 3 zsák, és a nyitott szája |
| *Ásók, repülők* | Későbbi fejezetekbe. | |

### Az MI-társ (Kessler)

- **Nem irányítható.** Követ: kicsit mögötted, oldalt, a lövésvonaladon
  kívül, és ha van, fal mellé húzódik.
- **Amíg nem harcolsz:** ha guggolsz vagy fedezékben vagy, ő is lent
  marad, halkan mozog, és nem lő.
- **Ha támadsz** (vagy a bogarak rátok támadnak), ő is harcba száll,
  sorozatokkal lő, a páncélosoknak a hátát célozza. Ettől kezdve ugyanúgy
  zajt csap, és ugyanúgy észrevehetik, mint téged.
- **Csendes leszedés:** ha egy halk lövéssel kiszedsz egy bogarat, és
  senki sem vadászik rátok, Kessler csak azt a célpontot segít leszedni,
  a többit nem ébreszti fel.
- Felsegít, ha elestél. Ha őt ütik ki, 12 mp múlva feláll: nem lehet
  elveszíteni. Ha nagyon lemarad és nem látod, utánad zárkózik.

### Pályák

Egy terület 320 × 320 m, nagyjából 20 perc, több alküldetéssel és
pályán belüli ellenőrzőpontokkal.

### Az 1. fejezet: Porfészek-hold

- **Bevezető átvezető:** a leszállóegység leteszi a csapatot.
- **Az út a kolóniáig:** az első kontaktus egy felborult rovernél. Itt
  jönnek a tippek: guggolás, zaj, fedezék.
- **A kolónia:** a műveleti központ naplóiból kiderül, hogy az északi
  bunkerben túlélők vannak. Két feladat jön, tetszőleges sorrendben:
  - **Áram:** a generátor beindítása után 45 mp-ig hullámokban jönnek a
    bogarak a földből; ki kell tartani.
  - **Relé:** a nyugati gerincen; az ösvényen és a tetőn bogarak és egy
    őrszem. Itt van a lézer, és itt szól először Marsh.
- **A kanyon:** három őrszem és alvó csapatok. Ez a fejezet lopakodós
  része. A végén a bunker, átvezetővel Teo Brandttal.
- **A gödör:** három szellőzőre kell töltetet tenni. Mindegyik ébreszt egy
  hullámot. Robbanás után a **Kaptárőr** jön elő (átvezető).
- **Kaptárőr:**
  - Csak a három világító zsákja és a nyitott szája sebezhető rendesen;
    a szája akkor nyílik ki, amikor üvölt, köp vagy rohamra készül.
  - Egy zsák szétlövése megtántorítja.
  - 1. fázis: csapás közelről, savzápor, roham (ha falnak megy, elkábul).
  - 2. fázis: ezen felül bogarakat hív a járatokból.
  - 3. fázis: gyorsabb, ráugrik a célpontjára, és a becsapódás lökéshulláma
    gyűrűként terjed (át kell ugrani).
- **Kimenekítés:** vissza a leszállóhelyre. A záró átvezetőben Marsh
  „rendezi az ügyet”, Oduya pedig közli, hogy Fagyhatár nem válaszol.
- **Adatlapok (5):** a kolónisták naplói a Deepcore titkolózásáról.

## 5. Platform és vezérlés

- **Asztali gép:** billentyűzet és egér, illetve gamepad (a Dream Fixer
  `gamepad.js`-e és `padnav.js`-e, menük fókuszmozgatással).
  - **Billentyűzet:** WASD, egér, bal klikk tűz, jobb klikk célzás, Szóköz
    ugrás, Shift futás, V kitérés, C / Ctrl guggolás, Q fedezék,
    R újratöltés, E használat, 1 / 2 / görgő / Tab fegyvercsere, X vállcsere,
    Esc szünet, Enter átvezető átugrása.
  - **Gamepad:** bal kar mozgás (benyomva futás), jobb kar nézés (benyomva
    vállcsere), RT tűz, LT célzás, A ugrás, B kitérés, X használat vagy
    újratöltés, Y fegyvercsere, RB fedezék, LB guggolás, Start szünet,
    Back átvezető átugrása. Célzássegítés: a nézés lelassul bogár fölött.
- **Mobil:** most nincs rá fókusz.
- **Nyelvek:** angol és magyar. A többi oldalnyelv (de, es, fr, zh) akkor
  jön, ha a szövegek véglegesek.
- **Nehézség:** Újonc / Ranger / Veterán (a kapott sebzés és a bogarak
  életereje).

## 6. Technikai felépítés

| Fájl | Feladat |
| --- | --- |
| `sim/terrain.js`, `sim/space.js` | Magasságmező-terep (2 m-es cellák, pont úgy háromszögelve, ahogy kirajzolódik) és a Dream Fixer dobozos-hengeres világa együtt: sugarak, padló. |
| `sim/body.js` | A Dream Fixer testmozgása, terepre, lejtőkorlátra és kitérésre bővítve. |
| `sim/player.js`, `sim/camrig.js` | A ranger: mozgás, fedezék, fegyverek, zaj; a vállkamera a szimulációban is ki van számolva, mert a lövés oda megy, ahová a kamera néz. |
| `sim/ally.js` | Kessler. |
| `sim/bugs.js`, `sim/warden.js` | A Kaptár és a boss. |
| `sim/nav.js` | 2 m-es járásrács, távolságmező célpontonként (Dijkstra). |
| `sim/run.js` | Egy futó küldetés: lépés, zajok, hullámok, lövedékek, feladatok, ellenőrzőpontok, átvezetők. |
| `levels/dustmoon.js` | A Porfészek-hold terepe és épületei. |
| `levels/dustmoon-script.js` | A küldetés forgatókönyve: szakaszok, triggerek, csoportok. |
| `render/…` | Égbolt gázóriással, terep- és pályamodellek darabokban, figurák procedurális animációval, effektek. |
| `hud.js`, `ui/menus.js` | DOM-alapú HUD és menük. |
| `story/director.js`, `voice.js` | Ki beszél, mikor; a hangok rádiós láncon. |

- A szimuláció fix 60 Hz-en fut, renderfüggetlen; az ellenőrzőpont egy
  kis pillanatkép (szakasz, flagek, felszerelés, hely), visszaálláskor
  ebből épül egy új Run.
- A távoli, nyugodt bogarak csak minden negyedik lépésben frissülnek.
- `npm run dev -w games/rim-ranger` (port 5360).
- `node scripts/flow.mjs [képelőtag]`: fej nélkül végigjátssza a teljes
  küldetést (teleport, használat, robotlövész), és kiírja, mi teljesült.
- `node scripts/shot.mjs <előtag> <szakasz>:x,z,yaw,pitch …`:
  képernyőképek.
  - Mindkettőhöz `PLAYWRIGHT_CORE` és (ha nem a szokásos helyen van)
    `CHROME` kell.
- `npm run voice -w games/rim-ranger`: a hangok legenerálása (ElevenLabs
  kulcs az `elevenlabs.txt`-ben vagy `ELEVENLABS_API_KEY`-ben); a
  szereplők hangja és a színészi utasítások a `scripts/cast.mjs`-ben.

## 7. Nyitott kérdések

- Végleges cím (javaslatok a beszélgetésben).
- A hub (a Hosszú Őrség fedélzete), fejlesztések, fejezetválasztó.
- A 2–6. fejezet tartalma, az ásók és a repülők.
- A szereplők végleges ElevenLabs-hangjai (most az előre elkészített
  hangtár hangjaival számol a szkript).
- A többi nyelv.
