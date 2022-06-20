import React from "react";
import styles from "./header.module.scss";

const Header = ({ children }) => (
  <div>
    <div className={styles.head}>{children}</div>
  </div>
);

export default Header;
