import { Route, Routes } from "react-router";

import IframeView from "../../ui/iframe-view/iframe-view";
import List from "../../ui/list/list";

const games = [
  {
    label: "Project Throttle",
    target: "project-throttle",
    preview: "/games/project-throttle/media/preview.webp",
    url: "/games/project-throttle/build/",
    badge: "in progress",
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

const GamerZone = () => (
  <Routes>
    {games.map(({ label, url, target }) => (
      <Route
        key={label}
        path={`/${target}`}
        element={<IframeView url={url} />}
      />
    ))}
    <Route path="/" element={<List list={games} />} />
  </Routes>
);

export default GamerZone;
