import React from "react";
import styles from "./iframe-view.module.scss";

const IframeView = ({ url }) => (
  <iframe
    className={styles.wrapper}
    title="content"
    width="100%"
    height="100%"
    src={url}
    allowFullScreen
    frameBorder="0"
  ></iframe>
);

export default IframeView;
