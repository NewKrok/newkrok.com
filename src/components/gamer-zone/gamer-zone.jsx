import { Route, Routes, useLocation } from "react-router";

import IframeView from "../../ui/iframe-view/iframe-view";
import List from "../../ui/list/list";
import usePageMeta from "../../ui/page-meta/use-page-meta";

const HITCH_PARK_DESCRIPTION =
  "Back the trailer into the bay: a free 3D physics parking game in your browser. 48 levels in 8 chapters, from a box trailer to caravans, boats, a semi-trailer and a tank on a low loader. Keyboard, mouse, touch and gamepad.";

const games = [
  {
    label: "Last Lantern",
    target: "last-lantern",
    preview: "/games/last-lantern/media/preview.webp",
    url: "/games/last-lantern/",
    badge: "new",
  },
  {
    label: "Hitch & Park",
    target: "hitch-park",
    preview: "/games/hitch-park/media/preview.webp",
    url: "/games/hitch-park/",
    title: "Hitch & Park — trailer parking game, free in your browser | NewKrok",
    description: HITCH_PARK_DESCRIPTION,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "VideoGame",
      name: "Hitch & Park",
      description: HITCH_PARK_DESCRIPTION,
      url: "https://newkrok.com/gamer-zone/hitch-park",
      image: "https://newkrok.com/games/hitch-park/media/preview.webp",
      genre: ["Driving", "Simulation", "Puzzle"],
      gamePlatform: "Web browser",
      applicationCategory: "Game",
      operatingSystem: "Any",
      playMode: "SinglePlayer",
      numberOfPlayers: 1,
      inLanguage: ["en", "de", "es", "hu", "zh", "fr"],
      author: { "@type": "Person", name: "István Krisztián Somoracz", url: "https://newkrok.com" },
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  },
  {
    label: "Project Throttle",
    target: "project-throttle",
    preview: "/games/project-throttle/media/preview.webp",
    url: "https://throttle.newkrok.com/",
    badge: "in progress",
  },
  {
    label: "MX Dash",
    target: "https://mxdash.newkrok.com/",
    preview: "/games/mxdash/media/preview.webp",
  },
  {
    label: "Life of a Fish",
    target: "https://loaf.newkrok.com/",
    preview: "/games/loaf/media/preview.webp",
  },
  {
    label: "Impossible Wheels",
    target: "impossible-wheels",
    preview: "/games/impossible-wheels/media/preview.webp",
    url: "/games/impossible-wheels/build/",
  },
  {
    label: "Valley Race",
    target: "valley-race",
    preview: "/games/valley-race/media/preview.webp",
    url: "/games/valley-race/build/",
  },
  {
    label: "Mountain Monster",
    target: "mountain-monster",
    preview: "/games/mountain-monster/media/preview.webp",
    url: "/games/mountain-monster/build/",
  },
];

// A game's own page: its title, description and canonical URL instead of
// the home page's.
const GamePage = ({ game }) => {
  usePageMeta({
    title: game.title ?? `${game.label} — free browser game | NewKrok`,
    description: game.description ?? `Play ${game.label}, a free browser game by NewKrok.`,
    path: `/gamer-zone/${game.target}`,
    image: game.preview,
    jsonLd: game.jsonLd,
  });
  // The page's query (e.g. a shared Hitch & Park ghost, ?ghost=123) goes on to the game.
  const { search } = useLocation();
  return <IframeView url={game.url + search} title={game.label} />;
};

const GameList = () => {
  usePageMeta({
    title: "Gamer Zone — free browser games | NewKrok",
    description: "Free browser games by NewKrok: Last Lantern, Hitch & Park, Impossible Wheels, Valley Race, Mountain Monster and more, made with three.js and nape-js.",
    path: "/gamer-zone",
  });
  return <List list={games} />;
};

const GamerZone = () => (
  <Routes>
    {games.filter((g) => g.url).map((game) => (
      <Route
        key={game.label}
        path={`/${game.target}`}
        element={<GamePage game={game} />}
      />
    ))}
    <Route path="/" element={<GameList />} />
  </Routes>
);

export default GamerZone;
