import React, { useEffect, useState } from 'react'
import AlbumBox from '../Components/AlbumBox'
import { Slide } from 'react-slideshow-image'
import uiuxImages from "./data/figma/uiuxImages"


function UiUxHome() {
    const [slidesToShow, setSlidesToShow] = useState(4); // Default to 4 slides on larger screens
  
    useEffect(() => {
      const handleResize = () => {
        if (window.innerWidth <= 768) {
          setSlidesToShow(1); // Show 1 slide on mobile
        } else {
          setSlidesToShow(5); // Show 4 slides on larger screens
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
          {uiuxImages.length > 0 ? (
            uiuxImages.map((project, index) => (
              <div key={index} className="w-full p-2">
                <AlbumBox project={project} link="uiux"/>
              </div>
            ))
          ) : (
            <p>No UI/UX projects available</p>
          )}
        </Slide>
      </div>
    </div>
  )
}

export default UiUxHome
