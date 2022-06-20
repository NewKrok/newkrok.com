import { Link } from "react-router-dom";
import React from "react";
import styles from "./list.module.scss";

const List = ({ list }) => {
  const onMouseMove = (e) => {
    var halfW = e.target.clientWidth / 2;
    var halfH = e.target.clientHeight / 2;
    var coorX = halfW - (e.pageX - e.target.offsetLeft);
    var coorY = halfH - (e.pageY - e.target.offsetTop);
    var degX = (coorY / halfH) * 15 + "deg";
    var degY = (coorX / halfW) * -15 + "deg";

    e.target.style.transform = `perspective(600px) scale(1.1) rotateX(${degX}) rotateY(${degY})`;
  };
  const onMouseOut = (e) => (e.target.style.transform = "");

  return (
    <div className={styles.list}>
      {list.map(({ label, preview, target }) => {
        return (
          <Link key={label} to={target}>
            <div
              className={styles.thumbnail}
              onMouseMove={onMouseMove}
              onMouseOut={onMouseOut}
            >
              <img src={preview} alt={label} />
              <div className={styles.label}>{label}</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default List;
