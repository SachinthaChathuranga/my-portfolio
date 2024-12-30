import React, { useEffect, useState } from "react";
import MobileDevbox from "../Components/MobileDevbox";
import { Slide } from "react-slideshow-image";
import webDevData from "./webDevData.json";

function WebHome() {
    const [slidesToShow, setSlidesToShow] = useState(4); // Default to 4 slides on larger screens
  
    useEffect(() => {
      const handleResize = () => {
        if (window.innerWidth <= 768) {
          setSlidesToShow(1); // Show 1 slide on mobile
        } else {
          setSlidesToShow(3); // Show 4 slides on larger screens
        }
      };
  
      // Initialize the slide count based on the current window size
      handleResize();
  
      // Add event listener for window resizing
      window.addEventListener("resize", handleResize);
  
      // Cleanup event listener on component unmount
      return () => window.removeEventListener("resize", handleResize);
    }, []);
  return (
    <div className="w-full p-5 m-auto justify-center h-[75vh] overflow-clip overflow-y-scroll scrollbar-hide">
      <Slide
        easing="ease"
        duration={1000} // Duration for each slide to stay
        slidesToShow={slidesToShow} // Show 4 items at once
        arrows={true} // Enable next and previous buttons
        autoplay={true} // Enable autoplay for automatic sliding
        infinite={true} // Infinite looping of slides
      >
        {webDevData.projects.map((project, index) => (
          <div key={index} className="w-full p-2">
            <MobileDevbox project={project} link="web" />
          </div>
        ))}
      </Slide>
    </div>
  );
}

export default WebHome;
