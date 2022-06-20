import React from "react";

const Game = ({ url }) => (
  <iframe
    title="content"
    width="100%"
    height="100%"
    src={url}
    allowFullScreen
    frameBorder="0"
    scrolling="no"
  ></iframe>
);

export default Game;
