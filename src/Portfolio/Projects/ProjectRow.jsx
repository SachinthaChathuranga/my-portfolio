import React from "react";

function ProjectRow({title, details}) {
  return (
    <div>
      <div className="flex justify-between mb-2 border-b-2  border-gray-300 dark:border-gray-700">
        <h1>{title}{": "}</h1>
        <h1 className="font-mono text-sm text-primaryBlue1">{details}</h1>
      </div>
    </div>
  );
}

export default ProjectRow;
