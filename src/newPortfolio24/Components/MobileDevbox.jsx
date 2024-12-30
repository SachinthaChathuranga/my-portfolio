import React from "react";
import img1 from "../assests/dcssmsc.jpg";
import { Link } from "react-router-dom";
import images from "../project/data/images";
import img2 from '../project/data/comingsoon.jpg'


export default function MobileDevbox({ project, link }) {
  console.log(images.m01[0]);
  const projectImage = images[project.id]?.[0] || img2;
  return (
    <Link to={`/my-portfolio/projects/dashboard/${link}/${project.id}`} >
      <div className="h-[70vh] flex flex-col justify-between rounded-md bg-primaryColor9 dark:bg-dPrimaryColor7 overflow-hidden p-2 shadow-lg font-poppins">
        <div>
          <div >
          <img className="h-48 w-full" src={projectImage} alt="" />
          </div>
          <h1 className="text-xl font-medium text-primaryColor2 dark:text-dPrimaryColor2">
            {project.projectName}
          </h1>
          <p className="text-justify text-primaryColor4 dark:text-dPrimaryColor4">
            {project.description}
          </p>
          <div className="flex gap-2 flex-wrap text-sm pt-3">
            {project.platformTechnologiesUsed.map((framework, index) => (
              <p
                key={index}
                className="bg-primaryColor6 text-primaryColor2 px-3 rounded-full dark:bg-dPrimaryColor4 dark:text-dPrimaryColor5"
              >
                {framework}
              </p>
            ))}
          </div>
        </div>
        <div>
          {" "}
          <h1 className="pb-2 text-right text-primaryColor4 dark:text-dPrimaryColor4">
            {project.date}
          </h1>
          <h1 className="text-center text-primaryColor6 bg-primaryColor2 py-1 rounded-md dark:text-dPrimaryColor4 dark:bg-dPrimaryColor5">
            {project.status}
          </h1>
        </div>
      </div>
    </Link>
  );
}
