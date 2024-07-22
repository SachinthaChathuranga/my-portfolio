import React, { useState } from "react";
import InputField from "./InputField";
import AboutHeading from "./AboutHeading";
import EducationField from "./EducationField";
import SkillsField from "./SkillsField";

function About() {
  const [personalDetails, setPersonalDetails] = useState([
    ["Name", "SM Sachintha Chathuranga"],
    ["BDay", "03/12/2000"],
    ["Address", "Madampe Chilaw, SriLanka"],
    ["School", "Ch/Senanayaka NC, Madampe"],
    ["University", "University Of Jaffna"],
    ["Phone", "0766862420"],
    ["Email", "smschathu123@gmail.com"],
  ]);

  const [edudcationDetails, setEducationDetails] = useState([
    {
      name: "University Of Jaffna",
      date: "Sep 2022-Present",
      marks: "Current Cumulative GPA - 3.22 out of 4.00",
    },
    {
      name: "GCE A/L",
      date: "Aug-2019",
      marks: "Results: BCC(Z-Score:1.0067)",
    },
    { name: "GCE O/L", date: "Dec 2016", marks: "Results: 7A | 2C" },
  ]);

  const [skills, setSkills] = useState({
    Java: "75%",
    React: "75%",
    ReactNative: "60%",
    PHP: "50%",
    "MySQL/MongoDB": "60%",
    Github: "70%",
    Figma: "80%",
    Illustrator: "75%",
  });
  

  return (
    <div className="mx-2">
      <div className="sm:flex sm:h-screen  pt-14 sm:mx-28 sm:gap-4">
        <div className="sm:w-1/2  sm:h-screen">
          <AboutHeading title="Personal Details" />
          <div className="m-5 mt-3">
            {personalDetails.map(([key, value], index) => (
              <InputField key={index} name={key} value={value} />
            ))}
          </div>

          <AboutHeading title="Education Details" />
          <div className="m-5 mt-3">
            {edudcationDetails.map((details, index) => (
              <EducationField
                key={index}
                name={details.name}
                date={details.date}
                marks={details.marks}
              />
            ))}
          </div>
        </div>
        <div className="sm:w-1/2  sm:h-screen">
          <AboutHeading title="Skills" />
          <div className="m-5 mt-3 pb-5">
          {Object.entries(skills).map(([key, value], index) => (
              <SkillsField key={index} title={key} percentage={value} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default About;
