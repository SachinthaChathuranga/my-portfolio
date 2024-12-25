import React from "react";

function DotBoxes({number, lColor, dColor}) {
  const grid = Array.from({ length: number }, () =>
    Array.from({ length: number }, (_, colIndex) => colIndex)
  );
  return (
    <div className="grid grid-cols-5 gap-3 opacity-50 w-fit">
      {grid.map((row, rowIndex) =>
        row.map((_, colIndex) => (
          <div
            key={`${rowIndex}-${colIndex}`}
            className={`w-1 h-1 sm:w-2 sm:h-2 bg-primaryColor3 dark:bg-dPrimaryColor4 animate-ping`}
          ></div>
        ))
      )}
    </div>
  );
}

export default DotBoxes;
