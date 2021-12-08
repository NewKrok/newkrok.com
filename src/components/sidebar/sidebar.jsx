import { Link, useLocation } from "react-router-dom";

import React from "react";
import styles from "./sidebar.module.scss";

const SideBar = () => {
  let location = useLocation();

  return (
    <div className={styles.Sidebar}>
      <div className={styles.ItemContainer}>
        <Link to="/home">
          <div
            className={`${styles.Item} ${
              location.pathname === "/home" && styles.SelectedItem
            }`}
          >
            <i className={`${styles.Icon} ${"fas fa-house-user"}`}></i>
            <div className={styles.Label}>Home</div>
          </div>
        </Link>
        {/*<Link to="/three-particles-editor">
          <div
            className={`${styles.Item} ${
              location.pathname === "/three-particles-editor" ||
              (location.pathname === "/" && styles.SelectedItem)
            }`}
          >
            <i className={`${styles.Icon} ${"fas fa-gamepad"}`}></i>
            <div className={styles.Label}>Escape Project</div>
          </div>
          </Link>*/}
        {/*<div className={styles.Item}>
                    <i className={`${styles.Icon} ${"fas fa-gamepad"}`}></i>
                    <div className={styles.Label}>My Games</div>
                </div>
                <div className={styles.Item}>
                    <i className={`${styles.Icon} ${"fas fa-code"}`}></i>
                    <div className={styles.Label}>Developer Area</div>
                </div>
                <div className={styles.Item}>
                    <i className={`${styles.Icon} ${"fas fa-info-circle"}`}></i>
                    <div className={styles.Label}>About Me</div>
                </div>*/}
      </div>
      <div className={styles.Name}>NewKrok</div>
    </div>
  );
};

export default SideBar;
