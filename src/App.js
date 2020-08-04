import React, { Component } from 'react';
import {
  BrowserRouter
} from "react-router-dom";

import SideBar from './components/sidebar/sidebar';

import './App.css';

class App extends Component {
  render() {
    return (
      <BrowserRouter>
        <div className="App">
          <SideBar/>
          <div className="content" />
        </div>
      </BrowserRouter>
    );
  }
}

export default App;
