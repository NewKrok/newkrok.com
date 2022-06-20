import { Route, Routes } from "react-router";

import Game from "./game";
import Header from "../../ui/header/header";
import { Link } from "react-router-dom";
import List from "../../ui/list/list";
import React from "react";

const games = [
  {
    label: "Impossible Wheels",
    target: "impossible-wheels",
    preview: "/games/impossible-wheels/media/preview.webp",
    url: "http://flashplusplus.net/html-game-standalone/impossible-wheels",
  },
  {
    label: "Valley Race",
    target: "valley-race",
    preview: "/games/valley-race/media/preview.webp",
    url: "http://flashplusplus.net/html-game-standalone/valley-race",
  },
  {
    label: "Mountain Monster",
    target: "mountain-monster",
    preview: "/games/mountain-monster/media/preview.webp",
    url: "http://flashplusplus.net/html-game-standalone/mountain-monster-html5",
  },
];

const GamerZone = () => (
  <>
    <Link to="/">
      <Header>
        GAMER ZONE <i className="fa-solid fa-gamepad"></i>
      </Header>
    </Link>
    <Routes>
      {games.map(({ label, url, target }) => (
        <Route key={label} path={`/${target}`} element={<Game url={url} />} />
      ))}
      <Route path="/" element={<List list={games} />} />
    </Routes>
  </>
);

export default GamerZone;
