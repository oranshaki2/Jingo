// This file maps all available question files for easy access
// Add new questions here as you create them

const questionsRegistry: Record<string, any> = {
  heels: require("./heels.json"),
  jeans: require("./jeans.json"),
  sneakers: require("./sneakers.json"),
  skirts: require("./skirts.json"),
};

export default questionsRegistry;
