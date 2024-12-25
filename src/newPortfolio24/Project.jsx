import React from "react";
import DotBoxes from "./Components/DotBoxes";
import CategoryBlock from "./Components/CategoryBlock";
import { FaFigma } from "react-icons/fa";
import { BsBrush } from "react-icons/bs";
import { FaMobileAlt } from "react-icons/fa";
import { MdOutlineWebAsset } from "react-icons/md";

function Project() {
  // Create a grid of 6x6

  return (
    <div className="h-screen">
      <div className="bg-primaryColor4 dark:bg-dPrimaryColor7 h-16 "></div>
      <div className="flex items-end justify-end pr-10 sm:pr-40 w-screen mt-5">
        <DotBoxes number={5} />
      </div>
      <div className="sm:w-2/5 m-auto">
        <div className=" flex -mt-10 items-center justify-center "> 
          <div className="w-40 h-40 sm:w-80 sm:h-80  opacity-20 bg-gradient-to-b to-transparent from-primaryColor4 dark:from-dPrimaryColor7 rounded-full animate-spin"></div>
        </div>
        <p className="text-center px-10 sm:px-0 -mt-28 sm:-mt-60 text-primaryColor2 dark:text-dPrimaryColor4">
          As a versatile developer and designer, I specialize in Mobile
          Development, Web Development, UI/UX Design, and Graphic Design. From
          crafting sleek apps and dynamic websites to designing captivating
          interfaces and stunning visuals, I bring creativity and precision to
          every project I undertake.
        </p>
      </div>
      <div className="flex items-end justify-start pl-10 sm:pl-40 w-screen mt-5">
        <DotBoxes number={5} />
      </div>
      <div className="m-auto w-fit sm:flex mt-5 justify-center gap-5 ">
        <CategoryBlock
          name="Web Developments"
          description="Dynamic and responsive websites crafted for modern businesses."
          icon={<FaFigma/>}
        />
        <CategoryBlock
          name="Mobile Developments"
          description="Innovative and user-friendly mobile applications tailored to meet your needs."
          icon={<FaFigma/>}
        />
        <CategoryBlock
          name="UI/UX Design"
          description="Beautiful, intuitive, and functional designs for an enhanced user experience."
          icon={<FaFigma/>}
        />
        <CategoryBlock
          name="Graphic Design"
          description="Creative visuals that capture attention and communicate effectively."
          icon={<BsBrush/>}
        />
      </div>
    </div>
  );
}

export default Project;
