import React, { useEffect } from "react";
import FrameWork from "./FrameWork";
import "aos/dist/aos.css"; // Import AOS CSS
import AOS from "aos";

function Skills() {
    useEffect(() => {
        AOS.init({
          duration: 1000, // Customize duration of the animation (optional)
          easing: "ease-in-out", // Customize easing function (optional)
          once: true, // Whether to animate only once (optional)
        });
      }, []);
  return (
    <div className="my-2 h-fit w-full  font-poppins" data-aos="fade-up" data-aos-duration="3000" data-aos-delay="600">
      <div className="m-1 overflow-hidden  p-5  shadow-lg rounded-lg bg-primaryColor9 dark:bg-dPrimaryColor8 text-primaryColor1 dark:text-dPrimaryColor4">
        <h1 className="text-3xl font-serif font-bold text-primaryColor2 dark:text-dPrimaryColor1 animate-pulse">
          Skills
        </h1>
        <div className="px-5 pt-1">
          <p className="text-xl font-medium text-center border-b-2 border-primaryColor1 dark:border-dPrimaryColor5 ">
            Front-End
          </p>
          <div className="flex flex-wrap items-center">
            <FrameWork name="React" />
            <FrameWork name="React Native" />
            <FrameWork name="HTML" />
            <FrameWork name="CSS" />
          </div>
        </div>

        <div className="px-5 pt-1">
          <p className="text-xl font-medium text-center border-b-2 border-primaryColor1 dark:border-dPrimaryColor5">
            Back-End
          </p>
          <div className="flex flex-wrap items-center">
            <FrameWork name="MySQL" />
            <FrameWork name="MongoDB" />
            <FrameWork name="Spring Boot" />
          </div>
        </div>

        <div className="px-5 pt-1">
          <p className="text-xl font-medium text-center border-b-2 border-primaryColor1 dark:border-dPrimaryColor5">
            Others
          </p>
          <div className="flex flex-wrap items-center">
            <FrameWork name="Figma" />
            <FrameWork name="Github" />
            <FrameWork name="Illustrator" />
          </div>
        </div>
{/*         
        <div className="transform translate-x-full hover:translate-x-0 transition-transform duration-500 ease-out">
          Hover me to slide in from the left
        </div>
        <div className="animate-pulse bg-blue-500 text-white p-4 rounded-lg">
          This element pulses
        </div>
        <div className="animate-spin bg-blue-500 text-white p-4 rounded-full w-20 h-20">
          Spinning
        </div>
        <div className="animate-bounce bg-blue-500 text-white p-4 rounded-lg">
          This element bounces
        </div>
        <div className="animate-fadeIn">This is a fading-in element</div>
        <div className="animate-bounceSlow">This is a bouncing element</div> */}
      </div>
    </div>
  );
}

export default Skills;
