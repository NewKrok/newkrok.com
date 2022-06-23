import { Route, Routes } from "react-router";

import Header from "../../ui/header/header";
import IframeView from "../../ui/iframe-view/iframe-view";
import { Link } from "react-router-dom";
import List from "../../ui/list/list";
import React from "react";

const entries = [
  {
    label: "Three Game Demos",
    target: "three-game-demos",
    preview: "/dev/three-game-demos/media/preview.webp",
    url: "https://newkrok.com/three-game-demo/index.html",
  },
  {
    label: "Particles Editor",
    target: "particles-editor",
    preview: "/dev/three-particles-editor/media/preview.webp",
    url: "https://newkrok.com/three-particles-editor/index.html",
  },
  {
    label: "My Github",
    target: "https://github.com/newkrok",
    preview: "/dev/github/media/preview.webp",
  },
  {
    label: "My CodePens",
    target: "https://codepen.io/search/pens?q=Just+a+little+ThreeJS",
    preview: "/dev/codepen/media/preview.webp",
  },
];

const DeveloperArea = () => (
  <>
    <Link to="/developer-area">
      <Header>
        DEVELOPER AREA <i className="fa-solid fa-gamepad"></i>
      </Header>
    </Link>
    <Routes>
      {entries.map(({ label, url, target }) => (
        <Route
          key={label}
          path={`/${target}`}
          element={<IframeView url={url} />}
        />
      ))}
      <Route path="/" element={<List list={entries} />} />
    </Routes>
  </>
);

export default DeveloperArea;
