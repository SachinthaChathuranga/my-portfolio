import React, { useState } from "react";
import { Route, Routes, Link } from "react-router-dom";
import MobileDevelopments from "./MobileDevelopments";
import WebDevelopments from "./WebDevelopments";
import UiUxDesigns from "./UiUxDesigns";
import GraphicDesign from "./GraphicDesign";
import { FaAngleRight, FaAngleDown } from "react-icons/fa";
import { RiMenuFold2Fill } from "react-icons/ri";
import { FaWindowClose } from "react-icons/fa";
import { FaRegWindowClose } from "react-icons/fa";

import mobileDevData from "./mobileDevData.json";
import webDevData from "./webDevData.json";
import uiuxDevData from "./data/figma/uiuxImages";
import graphicDevData from "./data/graphic/graphicImages";

function ProjectDashboard() {
  const [expandedSections, setExpandedSections] = useState({
    mobile: false,
    web: false,
    uiux: false,
    graphic: false,
  });
  const [showSideBar, setShowSideBar] = useState(false);

  const clickMenuButton = () => {
    setShowSideBar(true);
  };
  const clickCloseButton = () => {
    setShowSideBar(false);
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
    setShowSideBar(false);
  };

  return (
    <div className="sm:h-screen w-screen sm:flex ">
      {/* Sidebar */}
      <div className="sm:hidden">
        <div className="relative px-3 text-2xl bg-primaryColor5 flex mt-16 text-primaryColor2 dark:text-dPrimaryColor4">
          {!showSideBar && (
            <RiMenuFold2Fill
              className="fixed"
              onClick={() => clickMenuButton()}
            />
          )}
          {showSideBar && (
            <FaRegWindowClose
              className="fixed items-end justify-end end-3"
              onClick={() => clickCloseButton()}
            />
          )}
        </div>
      </div>
      {showSideBar && (
        <div className="sm:w-3/12 sm:h-[98vh] overflow-clip bg-primaryColor6 dark:bg-dPrimaryColor8">
          <ul className="text-primaryColor9 sm:mt-20 text-lg font-poppin ">
            <li className="px-5 py-2 text-center text-2xl text-primaryColor2 dark:text-dPrimaryColor2">
              Projects
            </li>

            <div className="overflow-y-scroll h-[calc(90vh-5rem)] scrollbar-hide">
              {/* Mobile Developments */}
              <li
                onClick={() => toggleSection("mobile")}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between px-10 py-2 bg-primaryColor2 dark:bg-dPrimaryColor6 mt-1">
                  <Link to={`/my-portfolio/projects/dashboard/mobile/`}>
                    <p className="hover:animate-pulse">Mobile Developments</p>
                  </Link>
                  {expandedSections.mobile ? <FaAngleDown /> : <FaAngleRight />}
                </div>

                {expandedSections.mobile && (
                  <ul className="bg-primaryColor4 cursor-pointer text-primaryColor1 dark:text-dPrimaryColor4">
                    {mobileDevData.projects.map((project) => (
                      <Link
                        to={`/my-portfolio/projects/dashboard/mobile/${project.id}`}
                        key={project.id}
                      >
                        <li className="px-16 py-1 hover:animate-pulse hover:bg-primaryColor3 dark:bg-dPrimaryColor7">
                          {project.projectName}
                        </li>
                      </Link>
                    ))}
                  </ul>
                )}
              </li>

              {/* Web Developments */}
              <li
                onClick={() => toggleSection("web")}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between px-10 py-2 bg-primaryColor2 dark:bg-dPrimaryColor6 mt-1">
                  <Link to={`/my-portfolio/projects/dashboard/web/`}>
                    <p className="hover:animate-pulse">Web Developments</p>
                  </Link>
                  {expandedSections.web ? <FaAngleDown /> : <FaAngleRight />}
                </div>
                {expandedSections.web && (
                  <ul className="bg-primaryColor4 cursor-pointer text-primaryColor1 dark:text-dPrimaryColor4">
                    {webDevData.projects.map((project) => (
                      <Link
                        to={`/my-portfolio/projects/dashboard/web/${project.id}`}
                        key={project.id}
                      >
                        <li className="px-16 py-1 hover:animate-pulse hover:bg-primaryColor3 dark:bg-dPrimaryColor7">
                          {project.projectName}
                        </li>
                      </Link>
                    ))}
                  </ul>
                )}
              </li>

              {/* UI/UX Designs */}
              <li
                onClick={() => toggleSection("uiux")}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between px-10 py-2 bg-primaryColor2 dark:bg-dPrimaryColor6 mt-1">
                  <Link to={`/my-portfolio/projects/dashboard/uiux/`}>
                    <p className="hover:animate-pulse">UI/UX Designs</p>
                  </Link>
                  {expandedSections.uiux ? <FaAngleDown /> : <FaAngleRight />}
                </div>
                {expandedSections.uiux && (
                  <ul className="bg-primaryColor4 cursor-pointer text-primaryColor1 dark:text-dPrimaryColor4">
                    {uiuxDevData.map((project) => (
                      <Link
                        to={`/my-portfolio/projects/dashboard/uiux/${project.id}`}
                        key={project.id}
                      >
                        <li className="px-16 py-1 hover:animate-pulse hover:bg-primaryColor3 dark:bg-dPrimaryColor7">
                          {project.title}
                        </li>
                      </Link>
                    ))}
                  </ul>
                )}
              </li>

              {/* Graphic Designs */}
              <li
                onClick={() => toggleSection("graphic")}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between px-10 py-2 bg-primaryColor2 dark:bg-dPrimaryColor6 mt-1">
                  <Link to={`/my-portfolio/projects/dashboard/graphic/`}>
                    <p className="hover:animate-pulse">Graphic Designs</p>
                  </Link>
                  {expandedSections.graphic ? (
                    <FaAngleDown />
                  ) : (
                    <FaAngleRight />
                  )}
                </div>
                {expandedSections.graphic && (
                  <ul className="bg-primaryColor4 cursor-pointer text-primaryColor1 dark:text-dPrimaryColor4">
                    {graphicDevData.map((project) => (
                      <Link
                        to={`/my-portfolio/projects/dashboard/graphic/${project.id}`}
                        key={project.id}
                      >
                        <li className="px-16 py-1 hover:animate-pulse hover:bg-primaryColor3 dark:bg-dPrimaryColor7">
                          {project.title}
                        </li>
                      </Link>
                    ))}
                  </ul>
                )}
              </li>
            </div>
          </ul>
        </div>
      )}

      {/* Content Area */}
      {!showSideBar && (
        <div className="sm:w-9/12 h-screen overflow-clip ">
          <Routes>
            <Route exact path="/mobile/*" element={<MobileDevelopments />} />
            <Route exact path="/web/*" element={<WebDevelopments />} />
            <Route exact path="/uiux/*" element={<UiUxDesigns />} />
            <Route exact path="/graphic/*" element={<GraphicDesign />} />
          </Routes>
        </div>
      )}
    </div>
  );
}

export default ProjectDashboard;
