import React, { useState } from "react";
import Project from "./Components/Project";
import ProjectsData from "./Projects/Data/projectsDataSet.json";
import AboutHeading from "./Components/AboutHeading";

function ProjectsSection() {


  return (
    <div className="pt-16 sm:pt-20 px-5 sm:px-32">
      <div className="sm:w-1/2">
        <AboutHeading title="My Projects" />
      </div>
      {/* flex flex-wrap justify-evenly pt-5 */}
      <div className="sm:grid sm:grid-cols-4  gap-4 pt-5">
        {ProjectsData.projects.map((project, index) => (
          <Project
            key={index}
            project={project}
          />
        ))}
      </div>
    </div>
  );
}

export default ProjectsSection;
