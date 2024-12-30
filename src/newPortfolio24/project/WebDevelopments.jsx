import React from "react";
import { Route, Routes, useParams } from "react-router-dom";
import ProjectDetails from "./ProjectDetails";
import WebHome from './WebHome'
import webDevData from './webDevData.json'

export default function WebDevelopments() {

  return (
    <div>
      <h1 className="mt-20 text-center text-3xl uppercase font-bold text-primaryColor2 dark:text-dPrimaryColor1 border-b-2 border-primaryColor2 w-fit m-auto dark:border-dPrimaryColor1">
        Web Developments
      </h1>
      <div className="w-full p-5 overflow-clip ">
        <Routes>
          <Route exact path="/" element={<WebHome />} />
          <Route exact path="/:id" element={<ProjectDetails ProjectsData={webDevData} />} />
        </Routes>
      </div>
    </div>
  )
}
