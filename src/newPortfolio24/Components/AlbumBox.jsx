import React, { useEffect, useState } from "react";
import img from "../assests/dcssmsc.jpg";
import { Link } from "react-router-dom";

function AlbumBox({ project, link }) {
  const [images, setImages] = useState([]);
  useEffect(()=>{
    setImages(project.images)
  }, [project])
  return (
    <Link to={`/my-portfolio/projects/dashboard/${link}/${project.id}`}>
      <div className=" font-poppins rounded-lg overflow-hidden  bg-primaryColor9 dark:bg-dPrimaryColor7 shadow-lg hover:animate-bounce">
        <img src={images[0]} alt="" className="h-60 w-full object-cover" />
        <div className=" w-full h-40 flex">
          <img src={images[1]} alt="" className="w-1/2 h-full object-cover border-2 border-primaryColor7 dark:border-dPrimaryColor8 animate-pulse" />
          <img src={images[2]} alt="" className="w-1/2 h-full object-cover border-2 border-primaryColor7 dark:border-dPrimaryColor8 animate-pulse" />
        </div>
        <div className="p-2 pb-4">
          <h1 className="font-poppins  text-lg font-medium">
            {/* {project.title} */}
          </h1>
          <div className="flex justify-between text-sm">
            <p className="bg-primaryColor6 text-primaryColor2 px-3 rounded-full dark:bg-dPrimaryColor4 dark:text-dPrimaryColor5 w-fit">
              {project.title || "hey"}
            </p>
            {/* total images */}
            <p className="bg-primaryColor6 text-primaryColor2 px-3 rounded-full dark:bg-dPrimaryColor4 dark:text-dPrimaryColor5 w-fit">
              {project.noOfImages}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default AlbumBox;
