import React from "react";
import { FaFigma } from "react-icons/fa";
import { BsBrush } from "react-icons/bs";
import { FaMobileAlt } from "react-icons/fa";
import { MdOutlineWebAsset } from "react-icons/md";
import { useNavigate } from "react-router-dom";

function CategoryBlock({ name, description, icon, link }) {
  const navigate = useNavigate();
  return (
    <div onClick={() => navigate(`/my-portfolio/projects/dashboard/${link}`)} className="mt-10 sm:mt-0 border-2 border-primaryColor2 dark:border-dPrimaryColor6 w-72 sm:w-48 h-40 rounded-lg bg-primaryColor7 dark:bg-dPrimaryColor8 hover:cursor-pointer animate-pulse hover:animate-bounce">
      <div className="bg-primaryColor5 dark:bg-dPrimaryColor7 w-fit p-3 rounded-full m-auto -mt-6 text-2xl text-primaryColor2 dark:text-dPrimaryColor3">
        {icon}
      </div>
      <p className="text-center font-medium text-primaryColor2 dark:text-dPrimaryColor3 pt-1">
        {name}
      </p>
      <p className="text-justify text-primaryColor3 dark:text-dPrimaryColor4 px-3 text-sm pt-2">
        {description}
      </p>
    </div>
  );
}

export default CategoryBlock;
