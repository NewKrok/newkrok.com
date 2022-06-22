import { Route, Routes } from "react-router";

import Header from "../../ui/header/header";
import IframeView from "../../ui/iframe-view/iframe-view";
import { Link } from "react-router-dom";
import List from "../../ui/list/list";
import React from "react";

const games = [
  {
    label: "Impossible Wheels",
    target: "impossible-wheels",
    preview: "/games/impossible-wheels/media/preview.webp",
    url: "/uploads/html/impossible_wheels",
  },
  {
    label: "Valley Race",
    target: "valley-race",
    preview: "/games/valley-race/media/preview.webp",
    url: "/uploads/html/valley_race",
  },
  {
    label: "Mountain Monster",
    target: "mountain-monster",
    preview: "/games/mountain-monster/media/preview.webp",
    url: "/uploads/html/mountain_monster-html5",
  },
];

const GamerZone = () => (
  <>
    <Link to="/gamer-zone">
      <Header>
        GAMER ZONE <i className="fa-solid fa-gamepad"></i>
      </Header>
    </Link>
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
  </>
);

export default GamerZone;
