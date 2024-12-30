import React from "react";
import { Route, Routes, useParams } from "react-router-dom";
import MobileHome from "./MobileHome";
import ProjectDetails from "./ProjectDetails";
import mobileDevData from './mobileDevData.json'

function MobileDevelopments() {
  const {id} = useParams();
  return (
    <div>
      <h1 className="mt-20 text-center text-3xl uppercase font-bold text-primaryColor2 dark:text-dPrimaryColor1 border-b-2 border-primaryColor2 w-fit m-auto dark:border-dPrimaryColor1">
        Mobile Developments
      </h1>
      <div className="w-full p-5 overflow-clip ">
        <Routes>
          <Route exact path="/" element={<MobileHome />} />
          <Route exact path="/:id" element={<ProjectDetails ProjectsData={mobileDevData} />} />
        </Routes>
      </div>
    </div>
  );
}

export default MobileDevelopments;
