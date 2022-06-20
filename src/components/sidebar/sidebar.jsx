import { Link, useLocation } from "react-router-dom";

import React from "react";
import styles from "./sidebar.module.scss";

const SideBar = () => {
  let location = useLocation();

  return (
    <div className={styles.Sidebar}>
      <div className={styles.ItemContainer}>
        <Link to="/gamer-zone">
          <div
            className={`${styles.Item} ${
              (location.pathname === "/gamer-zone" ||
                location.pathname === "/") &&
              styles.SelectedItem
            }`}
          >
            <i className={`${styles.Icon} ${"fa-solid fa-gamepad"}`}></i>
            <div className={styles.Label}>Gamer Zone</div>
          </div>
        </Link>
        <Link to="/developer-area">
          <div
            className={`${styles.Item} ${
              location.pathname === "/developer-area" && styles.SelectedItem
            }`}
          >
            <i className={`${styles.Icon} ${"fa-solid fa-laptop-code"}`}></i>
            <div className={styles.Label}>Developer Area</div>
          </div>
        </Link>
      </div>
      <div className={styles.Name}>NewKrok</div>
    </div>
  );
};

export default SideBar;
