import { Route, Routes } from "react-router";

import IframeView from "../../ui/iframe-view/iframe-view";
import List from "../../ui/list/list";

const entries = [
  {
    label: "QuickMesh",
    target: "https://quickmesh.dev/",
    preview: "/dev/quick-mesh/media/preview.webp",
  },
  {
    label: "QuickMap",
    target: "https://quickmap.dev/",
    preview: "/dev/quick-map/media/preview.webp",
  },
  {
    label: "Three Particles Projectile Demo",
    target: "three-particles-projectile-demo",
    preview: "/dev/three-particles-projectile-demo/media/preview.webp",
    url: "https://newkrok.com/three-particles-projectile-demo/index.html",
  },
  {
    label: "Three Game Demos",
    target: "three-game-demos",
    preview: "/dev/three-game-demos/media/preview.webp",
    url: "https://newkrok.com/three-game-demo/index.html",
  },
  {
    label: "Particles Editor",
    target: "https://three-particles-editor.newkrok.com/",
    preview: "/dev/three-particles-editor/media/preview.webp",
  },
  {
    label: "X / Twitter",
    target: "https://x.com/KSomoracz",
    preview: "/dev/x-com/media/preview.webp",
  },
  {
    label: "Find me on Discord",
    target: "https://discordapp.com/users/389164495295086592",
    preview: "/dev/discord/media/preview.webp",
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
  {
    label: "LinkedIn",
    target: "https://www.linkedin.com/in/istvan-krisztian-somoracz-8924b949",
    preview: "/dev/linkedin/media/preview.webp",
  },
];

const DeveloperArea = () => (
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
);

export default DeveloperArea;
