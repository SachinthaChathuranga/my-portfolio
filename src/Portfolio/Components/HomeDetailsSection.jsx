import React, { useEffect, useState } from "react";
import me from "../assets/me.png";
import SocialButton from "./SocialButton";

function HomeDetailsSection() {
  const skills = ["Front-end Developer", "Graphic Designer", "UI/UX Designer"];
  const [currentSkillIndex, setCurrentSkillIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSkillIndex((prevIndex) => (prevIndex + 1) % skills.length);
    }, 1500);

    return () => clearInterval(interval);
  }, [skills.length]);

  return (
    <div className="h-screen flex justify-center items-center">
      <div className=" overflow-hidden p-3 pt-20 sm:pt-28 sm:flex sm:mx-60 sm:justify-between">
        <div className="sm:mt-40 sm:w-1/2">
          <p className="text-xl">Hello, It's Me</p>
          <h1 className="text-3xl font-serif font-bold py-2">
            Sachintha Chathuranga
          </h1>
          <h2 className="text-xl py-1">
            And I'm a{" "}
            <span className="text-primaryBlue1 font-bold">
              {skills[currentSkillIndex]}
            </span>{" "}
          </h2>
          <h1 className="sm:mx-5 text-sm text-justify">
            I specialize in building scalable web applications and have a knack
            for creating efficient and elegant solutions.
          </h1>
          <div>
            <SocialButton />
          </div>
        </div>
        <div className="h-[500px] ">
          <img src={me} alt="" className="w-full h-full object-cover" />
          <div className="h-[400px] w-full bg-primaryBlue1 m-auto mt-[-400px] rounded-full"></div>
        </div>
      </div>
    </div>
  );
}

export default HomeDetailsSection;
