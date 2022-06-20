import Header from "../../ui/header/header";
import React from "react";
import styles from "./developer-area.module.scss";

const DeveloperArea = () => (
  <div className={styles.wrapper}>
    <Header>
      DEVELOPER AREA <i className="fa-solid fa-laptop-code"></i>
    </Header>

    <iframe
      title="content"
      width="100%"
      height="100%"
      src="https://newkrok.com/three-particles-editor/index.html"
      allowFullScreen
      frameBorder="0"
      scrolling="no"
    ></iframe>
  </div>
);

export default DeveloperArea;
