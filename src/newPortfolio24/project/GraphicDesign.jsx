import React from 'react'
import GraphicHome from './GraphicHome'
import Gallery from './Gallery'
import { Route, Routes } from 'react-router-dom'
import graphicImages from "./data/graphic/graphicImages";

function GraphicDesign() {
  return (
    <div>
       <h1 className="mt-20 text-center text-3xl uppercase font-bold text-primaryColor2 dark:text-dPrimaryColor1 border-b-2 border-primaryColor2 w-fit m-auto dark:border-dPrimaryColor1">
        Graphic Designs
      </h1>
      <div className="w-full p-5 overflow-clip ">
        <Routes>
          <Route exact path="/" element={<GraphicHome />} />
          <Route exact path="/:id" element={<Gallery projectsData={graphicImages} />} />
        </Routes>
      </div>
      
    </div>
  )
}

export default GraphicDesign
