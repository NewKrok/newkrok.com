import { Link, useLocation } from "react-router-dom";

import React from "react";
import styles from "./sidebar.module.scss";

const SideBar = () => {
  let location = useLocation();

  return (
    <div className={styles.sidebar}>
      <div className={styles.itemContainer}>
        <Link to="/gamer-zone">
          <div
            className={`${styles.item} ${
              (location.pathname === "/gamer-zone" ||
                location.pathname === "/") &&
              styles.selectedItem
            }`}
          >
            <i className={`${styles.icon} ${"fa-solid fa-gamepad"}`}></i>
            <div className={styles.label}>Gamer Zone</div>
          </div>
        </Link>
        <Link to="/developer-area">
          <div
            className={`${styles.item} ${
              location.pathname === "/developer-area" && styles.selectedItem
            }`}
          >
            <i className={`${styles.icon} ${"fa-solid fa-laptop-code"}`}></i>
            <div className={styles.label}>Developer Area</div>
          </div>
        </Link>
      </div>
      <div className={styles.name}>NewKrok</div>
    </div>
  );
};

export default SideBar;
