import { Link } from "react-router-dom";
import React from "react";
import styles from "./list.module.scss";

const List = ({ list }) => {
  const onMouseMove = (e) => {
    var halfW = e.target.firstChild.clientWidth / 2;
    var halfH = e.target.firstChild.clientHeight / 2;
    var coorX = halfW - (e.pageX - e.target.firstChild.offsetLeft);
    var coorY = halfH - (e.pageY - e.target.firstChild.offsetTop);
    var degX = (coorY / halfH) * 15 + "deg";
    var degY = (coorX / halfW) * -15 + "deg";

    e.target.firstChild.style.transform = `perspective(600px) scale(1.1) rotateX(${degX}) rotateY(${degY})`;
  };
  const onMouseOut = (e) => (e.target.firstChild.style.transform = "");

  return (
    <div className={styles.list}>
      {list.map(({ label, preview, target }) =>
        target.includes("https") ? (
          <a key={label} href={target} target="_blank" rel="noreferrer">
            <div
              className={styles.thumbnailContainer}
              onMouseMove={onMouseMove}
              onMouseOut={onMouseOut}
            >
              <div className={styles.thumbnail}>
                <img src={preview} alt={label} />
                <div className={styles.label}>{label}</div>
              </div>
            </div>
          </a>
        ) : (
          <Link key={label} to={target}>
            <div
              className={styles.thumbnailContainer}
              onMouseMove={onMouseMove}
              onMouseOut={onMouseOut}
            >
              <div className={styles.thumbnail}>
                <img src={preview} alt={label} />
                <div className={styles.label}>{label}</div>
              </div>
            </div>
          </Link>
        )
      )}
    </div>
  );
};

export default List;
