const recipeBook = import.meta.glob('./recipebook/*.(png|jpg|jpeg|svg)', { eager: true });
const wasnabakers = import.meta.glob('./wasanabakers/*.(png|jpg|jpeg|svg)', { eager: true });
const portfolio = import.meta.glob('./portfolio/*.(png|jpg|jpeg|svg)', { eager: true });
const samsonBakers = import.meta.glob('./samsonbakers/*.(png|jpg|jpeg|svg)', { eager: true });
const chatAi = import.meta.glob('./chatAiApp/*.(png|jpg|jpeg|svg)', { eager: true });
const toonGalaxy = import.meta.glob('./toongalxy/*.(png|jpg|jpeg|svg)', { eager: true });
const workScheduleApp = import.meta.glob('./workScheduleApp/*.(png|jpg|jpeg|svg)', { eager: true });


const convertGlobToArray = (glob) => Object.values(glob).map((module) => module.default || module);

const imagesData = [
    {
      id: "u01",
      title: "Recipe Book",
      subtitle: "Mobile App",
      images: convertGlobToArray(recipeBook),
      method: "figma",
      noOfImages: convertGlobToArray(recipeBook).length,
    },
    {
      id: "u02",
      title: "Wasana",
      subtitle: "Web App",
      images: convertGlobToArray(wasnabakers),
      method: "figma",
      noOfImages: convertGlobToArray(wasnabakers).length,
    },
    {
      id: "u03",
      title: "Portfolio Site",
      subtitle: "Web App",
      images: convertGlobToArray(portfolio),
      method: "figma",
      noOfImages: convertGlobToArray(portfolio).length,
    },
    {
      id: "u04",
      title: "Toon Galaxy",
      images: convertGlobToArray(toonGalaxy),
      method: "figma",
      subtitle: "Mobile App",
      noOfImages: convertGlobToArray(toonGalaxy).length,
    },
    {
      id: "u05",
      title: "Work Schedule",
      subtitle: "Mobile App",
      images: convertGlobToArray(workScheduleApp),
      method: "figma",
      noOfImages: convertGlobToArray(workScheduleApp).length,
    },
    {
      id: "u06",
      title: "Chat Ai App",
      subtitle: "Mobile App",
      images: convertGlobToArray(chatAi),
      method: "figma",
      noOfImages: convertGlobToArray(chatAi).length,
    },
    {
      id: "u05",
      title: "Samson Bakers",
      subtitle: "Mobile App",
      images: convertGlobToArray(samsonBakers),
      method: "figma",
      noOfImages: convertGlobToArray(samsonBakers).length,
    },
  ];
  
  export default imagesData;
  