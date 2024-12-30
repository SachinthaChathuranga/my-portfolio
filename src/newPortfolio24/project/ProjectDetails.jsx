import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import img1 from "../assests/dcssmsc.jpg";
import img2 from "../assests/smsc.jpg";
import img3 from "../assests/smscbgbw.jpg";
import { FaCircleChevronLeft, FaCircleChevronRight } from "react-icons/fa6";
// import ProjectsData  from './mobileDevData.json'
import dataImage from "./data/images";
import comingsoon from './data/comingsoon.jpg'

const imagesTemp = [comingsoon];

  const projectData = {
    projectName: "Portfolio Website",
    description: "A personal portfolio website to showcase my projects and skills.",
    projectType: "React",
    duration: "2 Days",
    teamMembers: ["Me"],
    platformTechnologiesUsed: ["React", "Tailwind CSS"],
    role: "Frontend Developer",
    date: "July 2024",
    linkToProject: "https://sachinthachathuranga.github.io/my-portfolio/",
    challenges: null,
    learnings: "Improved my React and CSS skills.",
    status: "Completed",
    librariesFrameworks: ["React Router", "Mobile Responsive"],
    stateManagement: null,
    apis: ["GitHub API"],
  };

function ProjectDetails({ProjectsData}) {
  const { id } = useParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [ProjectData, setProjectData] = useState([]);

  const images = dataImage[id] || imagesTemp;


  //check id == projectData.id then ProjectData = Projects[id] like function i want
  
  useEffect(() => {
    const project = ProjectsData.projects.find((project) => project.id === id); // Compare id from URL with project id
    if (project) {
      setProjectData(project); // Set the project data if found
    }
  }, [id]);
  console.log(ProjectData)

  const handleImageClick = (index) => {
    setSelectedIndex(index);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const showNextImage = () => {
    setSelectedIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const showPreviousImage = () => {
    setSelectedIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  return (
    <div className="w-full h-[200vh] text-primaryColor2 dark:text-dPrimaryColor4 text-justify p-5 ">
      <div className="sm:flex ">
        {/* Left Section: Project Details */}
        <div className="sm:w-1/2 h-[50vh] sm:h-[75vh] overflow-clip pr-2 overflow-y-scroll scrollbar-hide">
          {Object.entries(ProjectData).map(([key, value]) => (
            <div
              key={key}
              className="pt-2 flex justify-between text-lg border-b-2 border-primaryColor2 dark:border-dPrimaryColor4 dark:border-opacity-10 border-opacity-20"
            >
              <h1 className="capitalize">{key.replace(/([A-Z])/g, " $1")}:</h1>
              <p className="text-primaryColor3 dark:text-dPrimaryColor3">
                {Array.isArray(value) ? value.join(", ") : value || "N/A"}
              </p>
            </div>
          ))}
        </div>

        {/* Right Section: Image Gallery */}
        <div className="sm:w-1/2 flex flex-wrap gap-1 justify-around h-[40vh] sm:h-[75vh] overflow-clip overflow-y-scroll scrollbar-hide">
          {images.map((image, index) => (
            <div
              key={index}
              className="h-fit  cursor-pointer hover:shadow-lg"
              onClick={() => handleImageClick(index)}
            >
              <img
                src={image}
                alt={`Project Image ${index + 1}`}
                className="h-36 object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Modal for Image Preview */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative w-3/4 h-3/4">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-white text-2xl"
            >
              &times;
            </button>

            {/* Navigation Buttons */}
            <button
              onClick={showPreviousImage}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white text-4xl"
            >
              <FaCircleChevronLeft />
            </button>
            <button
              onClick={showNextImage}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white text-4xl"
            >
              <FaCircleChevronRight />
            </button>

            <img
              src={images[selectedIndex]}
              alt="Selected"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectDetails;
