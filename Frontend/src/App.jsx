import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
/* import Love from "./pages/Love"; */
import Demo from "./pages/Demo";
import About from "./pages/AboutPage.jsx";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
    {/*     <Route path="/love" element={<Love />} /> */}
        <Route path="/demo" element={<Demo />} />
        <Route path="/About" element={<About />} />
      </Routes>
    </Router>
  );
}

//Asmi Dagar/*  */