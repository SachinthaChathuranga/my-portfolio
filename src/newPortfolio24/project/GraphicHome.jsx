import React, { useEffect, useState } from "react";
import AlbumBox from "../Components/AlbumBox";
import { Slide } from "react-slideshow-image";
import graphicImages from "./data/graphic/graphicImages";

function GraphicHome() {
  const [slidesToShow, setSlidesToShow] = useState(4); // Default to 4 slides on larger screens

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSlidesToShow(1); // Show 1 slide on mobile
      } else {
        setSlidesToShow(4); // Show 4 slides on larger screens
      }
    };

    // Initialize the slide count based on the current window size
    handleResize();

    // Add event listener for window resizing
    window.addEventListener("resize", handleResize);

    // Cleanup event listener on component unmount
    return () => window.removeEventListener("resize", handleResize);
  }, []);


  console.log(graphicImages);
  return (
    <div className="flex gap-2">
      <div className="w-full p-5 m-auto justify-center h-[75vh] overflow-clip overflow-y-scroll scrollbar-hide">
        <Slide
          easing="ease"
          duration={1000}
          slidesToShow={slidesToShow}
          arrows={true}
          autoplay={true}
          infinite={true}
        >
          {graphicImages.length > 0 ? (
            graphicImages.map((project, index) => (
              <div key={index} className="w-full p-2">
                <AlbumBox project={project} link="graphic"/>
              </div>
            ))
          ) : (
            <p>No graphic projects available</p>
          )}
        </Slide>
      </div>
    </div>
  );
}

export default GraphicHome;
