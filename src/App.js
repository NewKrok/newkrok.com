import React, { Component } from "react";
import { BrowserRouter } from "react-router-dom";

import SideBar from "./components/sidebar/sidebar";

import "./App.css";

class App extends Component {
  render() {
    return (
      <BrowserRouter>
        <div className="App">
          <SideBar />
          <div className="content">
            <iframe
              title="content"
              width="100%"
              height="100%"
              src="http://newkrok.com/debug.html"
              allowFullScreen
              frameBorder="0"
              scrolling="no"
            ></iframe>
          </div>
        </div>
      </BrowserRouter>
    );
  }
}

export default App;
