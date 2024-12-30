import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FaCircleChevronLeft, FaCircleChevronRight } from "react-icons/fa6";

function Gallery({ projectsData }) {
  const { id } = useParams();
  const [projectData, setProjectData] = useState(null);
  const [images, setImages] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [col, setcol] = useState("none");

  useEffect(() => {
    const project = projectsData.find((project) => project.id === id);
    if (project) {
      setProjectData(project);
      setImages(project.images); // Use project.images instead of projectData.images
    }
  }, [id, projectsData]);

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
    <div>
      <div className="flex justify-between bg-primaryColor7 dark:bg-dPrimaryColor8 items-center">
        <h1 className="font-poppins text-lg">
          {projectData ? projectData.title : "Loading..."}
        </h1>
        <h1 className="font-poppins text-sm">
          {projectData ? projectData.subtitle : "Loading..."}
        </h1>
      </div>

      <div className="h-[75vh] overflow-clip pr-2 overflow-y-scroll scrollbar-hide">
        <div
          className={` columns-2 gap-3 lg:gap-3 sm:columns-3 lg:columns-${
            col === "none" ? 5 : col
          } md:columns-4 xl:columns-${col} ${
            col !== "none" &&
            "[&>img:not(:first-child)]:mt-5 lg:[&>img:not(:first-child)]:mt-8"
          }`}
        >
          {images.length > 0 ? (
            images.map((image, index) => (
              <div
                key={index}
                className="h-fit cursor-pointer hover:shadow-lg"
                onClick={() => handleImageClick(index)}
              >
                <img
                  src={image}
                  alt={`Project Image ${index + 1}`}
                  className="object-contain mt-3"
                />
              </div>
            ))
          ) : (
            <p>No images available</p>
          )}
        </div>
      </div>

      {/* Modal for Image Preview */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative w-3/4 h-full">
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

export default Gallery;
