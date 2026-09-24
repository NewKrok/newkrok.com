import { Link, useLocation } from "react-router-dom";

import Icon from "../../ui/icon/icon";
import { useState } from "react";
import styles from "./sidebar.module.scss";

// Evaluated on demand instead of tracked in state, so the first render does
// not depend on JS and there is no layout flip after hydration on mobile.
// The mobile-only styles themselves live in the stylesheet's media queries.
const isMobile = () => window.matchMedia("(max-width: 600px)").matches;

const SideBar = () => {
  let location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const handleSidebarClick = () => {
    if (isMobile() && !isExpanded) {
      setIsExpanded(true);
    }
  };

  const handleOverlayClick = () => {
    setIsExpanded(false);
  };

  const handleMenuItemClick = () => {
    if (isMobile()) {
      setIsExpanded(false);
    }
  };

  return (
    <>
      {isExpanded && (
        <div
          className={styles.overlay}
          onClick={handleOverlayClick}
          onKeyDown={handleOverlayClick}
          role="button"
          tabIndex={0}
        />
      )}
      <div
        className={`${styles.sidebar} ${
          isExpanded ? styles.expanded : ""
        }`}
        onClick={handleSidebarClick}
        onKeyDown={handleSidebarClick}
        role="button"
        tabIndex={0}
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
              <Icon name="gamepad" className={styles.icon} />
              <div className={styles.label}>Gamer Zone</div>
            </div>
          </Link>
          <Link to="/developer-area" onClick={handleMenuItemClick}>
            <div
              className={`${styles.item} ${
                location.pathname === "/developer-area" && styles.selectedItem
              }`}
            >
              <Icon name="laptopCode" className={styles.icon} />
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
