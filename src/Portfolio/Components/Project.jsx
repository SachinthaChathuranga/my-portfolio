import React, { useState } from "react";
import PropTypes from "prop-types";

import PopupWindow from "./PopupWindow";

function Project({ project }) {
  const [isPopupVisible, setIsPopupVisible] = useState(false);

  function handlePopupWindow() {
    setIsPopupVisible(!isPopupVisible);
  }

  // Ensure platformTechnologiesUsed and teamMembers are arrays or handle appropriately
  const technologies = Array.isArray(project.platformTechnologiesUsed)
    ? project.platformTechnologiesUsed
    : [project.platformTechnologiesUsed];

  const team = Array.isArray(project.teamMembers)
    ? project.teamMembers
    : [project.teamMembers];

  return (
    <div
      className="w-60 h-60 bg-primaryBlue1 rounded-3xl shadow-2xl py-3 hover:py-2 px-5 hover:px-4 mx-auto mb-5 hover:cursor-pointer hover:border-black dark:hover:border-white hover:border-2 flex flex-col"
      onClick={handlePopupWindow}
    >
      <div className="flex flex-col flex-grow">
        <h1 className="border-b-2 dark:border-white border-black text-md font-bold font-poppins">
          {project.projectName}
        </h1>
        <p className="text-justify">{project.description}</p>
        <p className=" mt-3 font-bold text-center border-2 rounded-md hover:bg-white dark:hover:bg-black">
          {Array.isArray(technologies)
            ? technologies.join(", ")
            : technologies.toString()}
        </p>
      </div>
      <div className="flex w-full justify-between items-center mt-auto">
        <p className="text-justify bg-red-400 px-2 rounded-md">{team.length > 1 ? "Group" : "Single"}</p>
        <p className="text-justify bg-green-400 px-2 rounded-md">{project.status}</p>
      </div>
      {isPopupVisible && (
        <PopupWindow closePopupWindow={handlePopupWindow} project={project} />
      )}
    </div>
  );
}

export default Project;

// Define PropTypes for the component
Project.propTypes = {
  project: PropTypes.shape({
    projectName: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    platformTechnologiesUsed: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.arrayOf(PropTypes.string),
    ]).isRequired,
    status: PropTypes.string.isRequired,
    teamMembers: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.arrayOf(PropTypes.string),
    ]).isRequired,
  }).isRequired,
};
