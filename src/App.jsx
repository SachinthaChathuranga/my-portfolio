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
          <Route exact path="/my-portfolio/" element={<Home />} />
          <Route path="/my-portfolio/projects" element={<ProjectsSection />} />
          <Route path="/my-portfolio/blog" element={<BlogSection />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
