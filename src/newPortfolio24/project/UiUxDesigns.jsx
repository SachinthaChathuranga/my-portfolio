import React from "react";
import { Route, Routes, useParams } from "react-router-dom";

import webDevData from './webDevData.json'
import UiUxHome from "./UiUxHome";
import Gallery from "./Gallery";
import uiuxImages from "./data/figma/uiuxImages"


export default function UiUxDesigns() {
  return (
    <div>
      <h1 className="mt-20 text-center text-3xl uppercase font-bold text-primaryColor2 dark:text-dPrimaryColor1 border-b-2 border-primaryColor2 w-fit m-auto dark:border-dPrimaryColor1">
        UI/UX Designs
      </h1>
      <div className="w-full p-5 overflow-clip ">
        <Routes>
          <Route exact path="/" element={<UiUxHome />} />
          <Route exact path="/:id" element={<Gallery projectsData={uiuxImages} />} />
        </Routes>
      </div>
    </div>
  )
}
