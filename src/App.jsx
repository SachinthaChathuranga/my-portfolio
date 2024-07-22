import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./Portfolio/Home";
import Project from "./Portfolio/Components/Project";
import NavigationBar from "./Portfolio/Components/NavigationBar";
import ProjectsSection from "./Portfolio/ProjectsSection";
import BlogSection from "./Portfolio/BlogSection";

function App() {
  return (
    <>
      <BrowserRouter>
        <NavigationBar />
        <Routes>
          <Route exact path="/" element={<Home />} />
          <Route path="/projects" element={<ProjectsSection />} />
          <Route path="/blog" element={<BlogSection />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
