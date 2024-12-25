import React, { useEffect, useState } from "react";
import me from "../assests/smscbgbw.jpg";
import SocialButton from "../../Portfolio/Components/SocialButton";

function ShortDescriptoin() {
    const skills = ["Front-end Developer", "Graphic Designer", "UI/UX Designer"];
    const [currentSkillIndex, setCurrentSkillIndex] = useState(0);
  
    useEffect(() => {
      const interval = setInterval(() => {
        setCurrentSkillIndex((prevIndex) => (prevIndex + 1) % skills.length);
      }, 1500);
  
      return () => clearInterval(interval);
    }, [skills.length]);
  
    return (
      <div className="h-fit w-full flex justify-center items-center animate-bounceSlow" data-aos="fade-up" data-aos-duration="2000" data-aos-delay="500">
        <div className="m-1 overflow-hidden sm:flex justify-center items-center shadow-lg rounded-lg bg-primaryColor9 dark:bg-dPrimaryColor8 text-primaryColor1 dark:text-dPrimaryColor4" >
          {/* details */}
          <div className="pt-5 sm:pt-0 px-5">
            <p className="text-xl">{`Hello, It's Me`}</p>
            <h1 className="text-3xl font-serif font-bold text-primaryColor2 dark:text-dPrimaryColor1 animate-pulse  ">
              Sachintha Chathuranga
            </h1>
            <h2 className="text-xl">
              {`And I'm a `}
              <span className="text-primaryColor4 dark:text-dPrimaryColor3 font-bold">
                {skills[currentSkillIndex]}
              </span>{" "}
            </h2>
            <h1 className="sm:mx-5 text-sm text-justify opacity-50">
              I specialize in building scalable web applications and have a knack
              for creating efficient and elegant solutions.
            </h1>
            <div className="pt-5 pb-5 sm:pb-0">
              <SocialButton />
            </div>
          </div>
          {/* image */}
          <div className="h-[300px]   ">
            <img src={me} alt="" className="w-full h-full object-cover " />
            <div className="h-[400px] w-full  m-auto mt-[-400px] rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

export default ShortDescriptoin
