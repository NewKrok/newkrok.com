import { Link } from "react-router-dom";
import styles from "./list.module.scss";
import { useRef } from "react";

// Thumbnails above the fold on a typical desktop viewport load eagerly, the
// rest lazily. The first ones are the likely LCP candidates.
const EAGER_COUNT = 4;
const HIGH_PRIORITY_COUNT = 2;

const List = ({ list }) => {
  const frame = useRef(0);

  const onMouseMove = (e) => {
    const container = e.currentTarget;
    const { clientX, clientY } = e;

    // Coalesce mousemove events to one style write per frame.
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const thumbnail = container.firstChild;
      const rect = container.getBoundingClientRect();
      const halfW = thumbnail.offsetWidth / 2;
      const halfH = thumbnail.offsetHeight / 2;
      const coorX = rect.left + rect.width / 2 - clientX;
      const coorY = rect.top + rect.height / 2 - clientY;
      const degX = (coorY / halfH) * 15 + "deg";
      const degY = (coorX / halfW) * -15 + "deg";

      thumbnail.style.transform = `perspective(600px) scale(1.1) rotateX(${degX}) rotateY(${degY})`;
    });
  };
  const onMouseOut = (e) => {
    cancelAnimationFrame(frame.current);
    e.currentTarget.firstChild.style.transform = "";
  };

  const renderThumbnail = ({ label, preview, badge }, index) => (
    <div
      className={styles.thumbnailContainer}
      onMouseMove={onMouseMove}
      onMouseOut={onMouseOut}
      onBlur={onMouseOut}
      role="presentation"
    >
      <div className={styles.thumbnail}>
        <img
          src={preview}
          alt={label}
          width="480"
          height="270"
          loading={index < EAGER_COUNT ? "eager" : "lazy"}
          fetchPriority={index < HIGH_PRIORITY_COUNT ? "high" : "auto"}
          decoding="async"
        />
        {badge && <div className={styles.badge}>{badge}</div>}
        <div className={styles.label}>{label}</div>
      </div>
    </div>
  );

  return (
    <div className={styles.list}>
      {list.map((entry, index) =>
        entry.target.includes("https") ? (
          <a key={entry.label} href={entry.target} target="_blank" rel="noreferrer">
            {renderThumbnail(entry, index)}
          </a>
        ) : (
          <Link key={entry.label} to={entry.target}>
            {renderThumbnail(entry, index)}
          </Link>
        )
      )}
    </div>
  );
};

export default List;
