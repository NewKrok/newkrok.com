# Peremőr (munkacím, angolul: *Rim Ranger*)

Történetes, külső nézetes (TPS) akciójáték böngészőre, asztali gépre,
billentyűzettel és egérrel vagy gamepaddel. Komolyabb hangvételű sci-fi:
rovarszerű idegen faj, elhallgató kolóniák, nagy, bejárható bolygófelszínek.
Kidolgozott low poly világ, ugyanazon a stacken, mint a Dream Fixer.

> Egy mondatban: a Peremvidék rangereinek újonca vagy, és bolygóról
> bolygóra visszavered a Kaptárt, míg végül le nem jutsz a fészek mélyére,
> a királynőhöz.

Állapot: a sztori és az alapok megvannak, a fejezetek részletei még
nincsenek kidolgozva. Ezt a dokumentumot bővítjük, ahogy haladunk.

---

## 1. Hangnem és stílus

- **Hangulat:** komolyabb sci-fi, de nem horror és nem véres. Fáradt
  veteránok, eltitkolt igazság, nagy tétek, de marad benne egy kis száraz
  humor a rádióforgalomban.
- **Ellenfelek:** a legyőzött bogarak összeesnek és szétporladnak, vér
  és testrészek nélkül, legfeljebb színes, világító nedvekkel.
- **A játékos elesik:** az MI-társ felsegíti, ha időben odaér. Ha nem, a
  legutóbbi mentési pontról folytatod (lásd a 4. fejezetet).
- **Vizuális stílus:** kidolgozott low poly, flat shading, vertex colorok.
  Minden bolygónak saját palettája van. A Kaptár elemei (bogarak, fészkek,
  spóraköd) világító, unlit részeket kapnak, ezekre fog a bloom.
- **Hang:** a zajok és a zene szintetizáltak, mint a korábbi játékokban.
  A beszélő szereplők angol hangja ElevenLabs-szal készül, minden nyelven
  angolul, a felirat a választott nyelven jelenik meg (a Dream Fixer
  `voice.js` / `scripts/voice.mjs` mintájára, rádiós szűréssel).

## 2. Szereplők

| Ki | Szerep |
| --- | --- |
| **Te, a ranger** | Néma főhős, újonc a Peremvidék rangereinél. Páncélos, sisakos figura, külső nézetből látszik. |
| **A társ** | Tapasztalt ranger, akit az MI irányít, és végig veled tart. Ő beszél helyetted is: reagál, kommentál, figyelmeztet. Neki van hangja (ElevenLabs). |
| **A parancsnok** | A rádióhang a hajóról. Fáradt veterán, kevés emberrel próbálja tartani a Peremvidéket. Ő adja ki a küldetéseket és viszi a sztorit. ElevenLabs-hang. |
| **A xenobiológus** | Ő ismeri a Kaptárt. Elmagyarázza az új bogártípusokat és azt, hogyan lehet elbújni előlük. Rajta keresztül jut el a tutorial a játékoshoz. ElevenLabs-hang. |
| **A társasági összekötő** | A bányatársaság embere. Segítőkésznek tűnik, később kiderül, hogy a cég évek óta tudott a Kaptárról. ElevenLabs-hang. |
| **A Kaptár királynője** | A végső ellenfél, a fészek mélyén. |

A nevek még nincsenek meg.

## 3. Sztoriív

A Peremvidék a galaxis széle: bányászkolóniák, farmholdak, egy
kereskedőállomás, és nagyon kevés ranger. A kolóniák egymás után
elhallgatnak. Az első jelentés még bányaszerencsétlenségről szól, de a
helyszínen kiderül, hogy egy rovarszerű faj rajzott elő a mélyből: a
helyiek **Kaptár**nak hívják.

Hat terület, a fejezetek tartalma még nincs kidolgozva, csak az ív:

1. **Porfészek-hold, első kontaktus:** a bánya túl mélyre ásott, és
   felébresztette a fészket. Kiderül, hogy ez nem egyedi eset.
2. **Jégvilág, terjedés:** a Kaptár már máshol is ott van.
3. **Dzsungelbolygó, terjedés:** a bogarak összehangoltan mozognak, egy
   akarat irányítja őket.
4. **Kereskedőállomás, fordulópont:** ostrom és evakuálás. Kiderül, hogy
   a fészkeket egy királynő irányítja, és hogy a bányatársaság tudott
   róluk, csak eltitkolta.
5. **Vulkánhold, felkutatás:** a raj forrását követve megtaláljátok a fő
   fészek bejáratát.
6. **Finálé, a fészek mélye:** le a királynőhöz. Többfázisú bossharc,
   utána a Kaptár szétesik.

A történet csatornái:
- **Rádióforgalom** a pálya közben (parancsnok, xenobiológus, összekötő).
  Rövid, nem veszi el az irányítást.
- **A társ megjegyzései** a helyszínen.
- **Gyűjthető naplók és felvételek** a kolóniákon: a lakók és a társaság
  kis történetei, ezekből áll össze az eltitkolás.
- **A hub, a rangerek hajója:** a küldetések között változik.

## 4. Játékmenet

### Harc

- **Pörgős és ugrálós:** vállkamerás célzás, ugrás, dash, lövés mozgás
  közben is.
- **Fedezékrendszer:** a fedezék a köpködő és nagy lövedékes bogarak ellen
  kell, és ez adja a lopakodást is. A fedezékbe gombnyomásra beugrasz,
  onnan kilőhetsz, és fedezékről fedezékre mozoghatsz.

### Érzékelés és lopakodás

A bogarak elsősorban **rezgésből és hangból érzékelnek**, csak egyes
típusok látnak:
- A futás, az ugrás és a lövés zajos, a guggolva járás és a fedezék melletti
  mozgás halk.
- A fedezék takar, és tompítja a zajt is.
- Egyes küldetésekben az a cél, hogy bújkálva jusson át a játékos egy
  területen, vagy ne riassza a rajt.

### Bogártípusok (vázlat)

| Típus | Viselkedés |
| --- | --- |
| **Rajzók** | Kicsik, gyorsak, tömegesen jönnek. |
| **Köpködők** | Távolról lőnek. Ellenük kell fedezék. |
| **Páncélos rohamozók** | Szemből páncélozottak, csak hátulról vagy oldalról sebezhetők. |
| **Ásók** | A föld alól törnek fel. |
| **Repülők** | A levegőből támadnak. |
| **Őrszemek** | Látnak, és riasztják a rajt. A lopakodós részek kulcsai. |
| **A királynő** | A finálé bossa. |

### Az MI-társ

- Követ, fedezékbe húzódik, lő, és felsegít, ha elestél.
- Lopakodásnál ő is halkan mozog, és nem indít harcot magától.
- Egyszerű parancsok egy gombbal, például: „várj itt” / „gyere” vagy
  célpont kijelölése. A pontos készletet később döntjük el.
- Nem lehet elveszíteni: ha ő esik el, egy idő után talpra áll.

### Pályák

- **Nagy, bejárható területek**, egy-egy bolygón vagy holdon körülbelül 20
  perc játékkal.
- **Több alküldetés** egy területen belül, például: áram visszakapcsolása,
  túlélők kimentése, fészeknyílások lezárása, minták gyűjtése. A végén jön
  a terület bossa.
- **Mentési pontok a területen belül**, hogy egy elesés után ne kelljen
  elölről kezdeni.

### Hub

A rangerek hajója: küldetésválasztás, fegyver- és felszerelésfejlesztés,
a gyűjtött naplók és trófeák.

## 5. Platform és vezérlés

- **Asztali gép:** billentyűzet és egér, illetve gamepad (a Hitch & Park és
  a Dream Fixer `gamepad.js` mintájára, menük fókuszmozgatással).
- **Mobil:** most nincs rá fókusz.
- **Nyelvek:** a többi játékhoz hasonlóan több nyelv a felületen és a
  feliratokban, a hangok angolul.

## 6. Technikai megfontolások

- **Stack:** three.js, saját 3D ütközéskezelés (a Dream Fixer alapján),
  Vite, sima ES modulok. Lásd a `games/GAME-DEV.md`-t.
- **Nagy pályák:** darabolt terep, LOD, térbeli felosztás az ütközéshez és
  az MI-hez. Statikus elemek összevonva, ismétlődő elemek `InstancedMesh`-sel.
- **Sok bogár:** `InstancedMesh`-alapú megjelenítés, olcsó, csoportos MI
  (raj-szintű döntések, egyedi szinten csak egyszerű mozgás).
- **Headless tesztelés:** egy bot, ami végigjátszik egy területet, mint a
  Dream Fixer és a Last Lantern esetében.

## 7. Nyitott kérdések

- Végleges cím és a szereplők nevei.
- A fejezetek részletes tartalma, alküldetései és bossai.
- Fegyverek és fejlesztések.
- Az MI-társ parancskészlete.
- Rövid átvezetők legyenek-e (játékmotorban), vagy csak rádióforgalom.
