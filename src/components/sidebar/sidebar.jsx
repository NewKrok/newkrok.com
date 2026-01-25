import { Link, useLocation } from "react-router-dom";

import { useState, useEffect } from "react";
import styles from "./sidebar.module.scss";

const SideBar = () => {
  let location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 600);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleSidebarClick = () => {
    if (isMobile && !isExpanded) {
      setIsExpanded(true);
    }
  };

  const handleOverlayClick = () => {
    setIsExpanded(false);
  };

  const handleMenuItemClick = () => {
    if (isMobile) {
      setIsExpanded(false);
    }
  };

  return (
    <>
      {isMobile && isExpanded && (
        <div className={styles.overlay} onClick={handleOverlayClick} />
      )}
      <div
        className={`${styles.sidebar} ${
          isMobile && isExpanded ? styles.expanded : ""
        }`}
        onClick={handleSidebarClick}
      >
        <div className={styles.itemContainer}>
          <Link to="/gamer-zone" onClick={handleMenuItemClick}>
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
          <Link to="/developer-area" onClick={handleMenuItemClick}>
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
    </>
  );
};

export default SideBar;
