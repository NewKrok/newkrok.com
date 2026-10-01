import { useState } from "react";

import { openCookieSettings } from "../../ui/cookie-consent/cookie-consent";
import styles from "./privacy.module.scss";
import usePageMeta from "../../ui/page-meta/use-page-meta";

// The privacy notice for newkrok.com and its games, in English and
// Hungarian. Keep both in step with what the site really does:
// analytics (src/index.html, the games' analytics.js), the games'
// localStorage and the Hitch & Park leaderboard (public/api/hitch-park/).
const UPDATED = "2026-10-01";
const CONTACT = "https://x.com/KSomoracz";

const Cookies = ({ children }) => (
  <button type="button" className={styles.inline} onClick={openCookieSettings}>
    {children}
  </button>
);

const English = () => (
  <>
    <h1>Privacy</h1>
    <p className={styles.updated}>Last updated: {UPDATED}</p>
    <p>
      newkrok.com is the personal site of István Krisztián Somoracz, who is
      responsible for the data described here. Questions or requests:{" "}
      <a href={CONTACT} target="_blank" rel="noopener noreferrer">@KSomoracz on X</a>.
      There are no ads on the site, nothing is sold and nobody is profiled.
    </p>

    <h2>Visit statistics (only if you accept)</h2>
    <p>
      With your consent the site and the games use Google Analytics 4 to count
      visits and see which games and levels get played: pages viewed, game
      events (a level started, finished or given up, the camera or language
      picked), and general device information such as the browser, the screen
      size and the country. Google processes this for us and may do so outside
      the EU under the EU–US Data Privacy Framework; it keeps the data for at
      most 14 months. Without consent no analytics cookie is set and nothing is
      sent. You can change your choice at any time under{" "}
      <Cookies>Cookies</Cookies> in the side bar. Legal basis: your consent
      (GDPR Art. 6(1)(a)).
    </p>

    <h2>Stored in your browser</h2>
    <p>
      The games keep your progress, best scores and settings in your
      browser&apos;s local storage, and the site keeps your cookie choice there.
      This never leaves your device, except as described for the leaderboard
      below. Clearing the site data in your browser removes it.
    </p>

    <h2>Hitch &amp; Park leaderboard (only if you choose a name)</h2>
    <p>
      Nothing is sent to the leaderboard until you pick a leaderboard name.
      After that, for each run that beats your best on a job, we store:
    </p>
    <ul>
      <li>your leaderboard name, which <b>everyone can see</b> next to your scores;</li>
      <li>a fingerprint of the secret key your browser keeps for you (no account, no e-mail, no password);</li>
      <li>the run: job, score, time, stars, bumps and cones, the date, the browser family (e.g. &quot;firefox&quot;) and
        the <b>replay</b>, i.e. your steering, throttle and brake inputs. Replays are checked on our side
        (a GitHub Action replays them) and checked runs can be watched by others as a ghost car.</li>
    </ul>
    <p>
      Your IP address is not stored with any of this. To stop abuse, the server
      counts requests per salted, one-way hash of the IP address; those counters
      are deleted within 20 minutes. Used run tokens (random codes, no personal
      data) are kept for 7 days. Like every website, the hosting provider keeps
      short-lived access logs for security.
    </p>
    <p>
      The leaderboard data is kept until you delete it or the board is reset.
      You can delete your name and all your runs yourself at any time in the
      game: <i>Leaderboard → Delete my leaderboard data</i>. If you no longer
      have the browser you played in, contact us with your leaderboard name.
      Legal basis: providing the leaderboard you asked to join (GDPR Art.
      6(1)(b)) and our legitimate interest in a fair, abuse-free board (Art.
      6(1)(f)).
    </p>

    <h2>Your rights</h2>
    <p>
      You can ask for access to, correction or deletion of your data, restrict
      or object to its use, and take it with you. You can also complain to a
      data protection authority, in Hungary the NAIH (naih.hu).
    </p>
  </>
);

const Hungarian = () => (
  <>
    <h1>Adatvédelem</h1>
    <p className={styles.updated}>Utolsó módosítás: {UPDATED}</p>
    <p>
      A newkrok.com Somoracz István Krisztián személyes oldala; az itt leírt
      adatokért ő felel. Kérdés vagy kérés:{" "}
      <a href={CONTACT} target="_blank" rel="noopener noreferrer">@KSomoracz az X-en</a>.
      Az oldalon nincs reklám, adatot nem adunk el, és senkiről nem készül profil.
    </p>

    <h2>Látogatási statisztika (csak ha elfogadod)</h2>
    <p>
      Hozzájárulásoddal az oldal és a játékok a Google Analytics 4-et használják
      a látogatások számolására és arra, hogy lássuk, mely játékok és pályák
      népszerűek: megtekintett oldalak, játékesemények (pálya indítása,
      teljesítése vagy feladása, a választott kamera vagy nyelv) és általános
      eszközadatok, például böngésző, képernyőméret és ország. Ezeket a Google
      dolgozza fel nekünk, akár az EU-n kívül is, az EU–USA adatvédelmi
      keretrendszer alapján, és legfeljebb 14 hónapig őrzi. Hozzájárulás nélkül
      nem kerül fel analitikai süti, és semmi nem lesz elküldve. A döntésed
      bármikor módosíthatod az oldalsáv <Cookies>Cookies</Cookies> gombjával.
      Jogalap: a hozzájárulásod (GDPR 6. cikk (1) a)).
    </p>

    <h2>A böngésződben tárolt adatok</h2>
    <p>
      A játékok a haladásodat, a legjobb eredményeidet és a beállításaidat a
      böngésző helyi tárolójában (localStorage) tartják, az oldal pedig itt
      jegyzi meg a sütikre vonatkozó döntésedet. Ezek nem hagyják el az
      eszközödet, kivéve a ranglistánál leírtakat. Az oldal adatainak
      törlésével a böngészőben ezek is törlődnek.
    </p>

    <h2>Hitch &amp; Park ranglista (csak ha nevet választasz)</h2>
    <p>
      Amíg nem adsz meg nevet a ranglistához, semmi nem kerül a ranglistára.
      Utána minden menetről, amely megdönti a legjobb eredményedet egy
      feladaton, ezeket tároljuk:
    </p>
    <ul>
      <li>a ranglistás neved, amelyet <b>bárki láthat</b> az eredményeid mellett;</li>
      <li>a böngésződ által őrzött titkos kulcs ujjlenyomatát (nincs fiók, e-mail vagy jelszó);</li>
      <li>a menetet: feladat, pont, idő, csillagok, ütközések és bóják, dátum, a böngésző típusa (pl. &quot;firefox&quot;) és
        a <b>visszajátszás</b>, vagyis a kormány-, gáz- és fékbemeneteid. A visszajátszásokat nálunk ellenőrizzük
        (egy GitHub Action lejátssza őket), az ellenőrzött meneteket pedig mások ghost autóként megnézhetik.</li>
    </ul>
    <p>
      Az IP-címedet ezek mellett nem tároljuk. A visszaélések ellen a szerver az
      IP-cím sózott, visszafejthetetlen hash-e szerint számolja a kéréseket; ezek
      a számlálók 20 percen belül törlődnek. A felhasznált menet-tokeneket
      (véletlen kódok, személyes adat nélkül) 7 napig őrizzük. Mint minden
      weboldalnál, a tárhelyszolgáltató biztonsági célból rövid ideig
      hozzáférési naplót vezet.
    </p>
    <p>
      A ranglista adatait addig őrizzük, amíg nem törlöd őket, vagy a lista
      újra nem indul. A neved és az összes meneted bármikor magad is törölheted
      a játékban: <i>Ranglista → Ranglistás adataim törlése</i>. Ha már nincs
      meg a böngésző, amelyben játszottál, írj nekünk a ranglistás neveddel.
      Jogalap: a ranglista, amelyhez csatlakozni kértél (GDPR 6. cikk (1) b)),
      és jogos érdekünk egy tisztességes, visszaélésmentes ranglistához (6. cikk
      (1) f)).
    </p>

    <h2>Jogaid</h2>
    <p>
      Kérhetsz hozzáférést az adataidhoz, azok helyesbítését vagy törlését,
      kérheted a kezelés korlátozását, tiltakozhatsz ellene, és kikérheted
      őket. Panasszal a Nemzeti Adatvédelmi és Információszabadság Hatósághoz
      (naih.hu) is fordulhatsz.
    </p>
  </>
);

const initialLang = () => {
  const q = new URLSearchParams(window.location.search).get("lang");
  if (q === "hu" || q === "en") return q;
  return (navigator.language || "").toLowerCase().startsWith("hu") ? "hu" : "en";
};

const Privacy = () => {
  const [lang, setLang] = useState(initialLang);
  usePageMeta({
    title: "Privacy | NewKrok",
    description: "What newkrok.com and its games store about you: optional analytics, browser storage and the Hitch & Park leaderboard.",
    path: "/privacy",
  });
  return (
    <div className={styles.page}>
      <div className={styles.lang}>
        <button type="button" className={lang === "en" ? styles.on : ""} onClick={() => setLang("en")}>English</button>
        <button type="button" className={lang === "hu" ? styles.on : ""} onClick={() => setLang("hu")}>Magyar</button>
      </div>
      <article className={styles.text} lang={lang}>{lang === "hu" ? <Hungarian /> : <English />}</article>
    </div>
  );
};

export default Privacy;
