import React from "react";
import { createRoot } from "react-dom/client";
import WeeklyPlanner from "./WeeklyPlanner.jsx";

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <WeeklyPlanner />
  </React.StrictMode>
);
