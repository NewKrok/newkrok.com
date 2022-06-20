import "./App.css";

import { BrowserRouter, Navigate, Routes } from "react-router-dom";

import DeveloperArea from "./components/developer-area/developer-area";
import GamerZone from "./components/gamer-zone/gamer-zone";
import React from "react";
import { Route } from "react-router";
import SideBar from "./components/sidebar/sidebar";

const App = () => {
  return (
    <BrowserRouter>
      <div className="App">
        <SideBar />
        <div className="content">
          <Routes>
            <Route index path="/gamer-zone/*" element={<GamerZone />} />
            <Route path="/developer-area" element={<DeveloperArea />} />
            <Route path="*" element={<Navigate to="/gamer-zone" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
