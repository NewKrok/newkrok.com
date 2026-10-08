import styles from "./iframe-view.module.scss";

const IframeView = ({ url, title = "content" }) => (
  <iframe
    className={styles.wrapper}
    title={title}
    width="100%"
    height="100%"
    src={url}
    allowFullScreen
    allow="fullscreen; gamepad; clipboard-write; web-share"
    frameBorder="0"
  ></iframe>
);

export default IframeView;
