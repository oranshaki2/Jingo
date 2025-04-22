# Define categories and associated words
categories = {
    "Animals": [
        "animal", "animals", "alligator", "alligators", "alpaca", "alpacas", "anaconda", "anacondas", "ant", "ants", "antelope", "antelopes", "armadillo", "armadillos", "baboon", "baboons", "bat", "bats", "bear", "bears",
        "beast", "bee", "bees", "beetle", "beetles", "buffalo", "buffalos", "butterfly", "butterflies", "camel", "camels",
        "cat", "cats", "caterpillar", "caterpillars", "cheetah", "cheetahs", "chicken", "chickens", "chimpanzee", "chimpanzees", "chinchilla", "chinchillas", "chipmunk", "chipmunks",
        "cow", "cows", "cobra", "cobras", "crab", "crabs", "cricket", "crickets", "crocodile", "crocodiles", "crow", "crows", "deer", "dog", "dogs", "dolphin", "dolphins",
        "donkey", "donkeys", "dove", "doves", "dragon", "dragonfly", "dragonflies", "duck", "ducks", "dinosaur", "dinosaurs", "eagle", "eagles", "elephant", "elephants", "falcon", "falcons", "ferret", "ferrets",
        "fish", "firefly", "fireflies", "flamingo", "flamingos", "fox", "foxes", "frog", "frogs", "giraffe", "giraffes", "goat", "goats",
        "goose", "geese", "gorilla", "gorillas", "goldfish", "grasshopper", "grasshoppers", "grizzly", "hamster", "hamsters", "hawk", "hawks", "hedgehog", "hedgehogs",
        "hippo", "hippos", "hippopotamus", "horse", "horses", "hyena", "hyenas", "ibex", "ibexes", "iguana", "iguanas", "jaguar", "jaguars", "jellyfish", "kangaroo", "kangaroos", "koala", "koalas",
        "leopard", "leopards", "lemur", "lemurs", "lice", "lion", "lions", "lizard", "lizards", "lobster", "lobsters", "llama", "llamas", "mole", "moles", "monkey", "monkeys", "mongoose", "mongooses",
        "moose", "mosquito", "mosquitoes", "moth", "mouse", "mice", "nightingale", "nightingales", "octopus", "octopuses", "ostrich", "ostriches", "otter", "otters", "owl", "owls",
        "ox", "oxen", "panda", "pandas", "parrot", "parrots", "peacock", "peacocks", "pelican", "pelicans", "penguin", "penguins", "pig", "pigs",
        "pigeon", "pigeons", "Penguin", "Penguins", "platypus", "platypuses", "porcupine", "porcupines", "rabbit", "rabbits", "raccoon", "raccoons", "rat", "rats", "raven", "ravens",
        "reindeer", "rhino", "rhinos", "scorpion", "scorpions", "sea_lion", "sea_lions", "seal", "seals", "seahorse", "seahorses", "sea_urchin", "sea_urchins",  "seagull", "seagulls", "shark", "sharks", "sheep", "skunk", "skunks", "sloth", "sloths",
        "snail", "snails", "snake", "snakey", "snakes", "songbird", "songbirds", "sparrow", "sparrows", "spider", "spiders", "squid", "squids", "squirrel", "squirrels", "starfish", "stingray", "stingrays",
        "swan", "swans", "swordfish", "termite", "termites", "tiger", "tigers", "toad", "toads", "toucan", "toucans", "turtle", "turtles", "unicorn", "unicorns", "walrus", "walruses",
        "wasp", "wasps", "whale", "whales", "wolf", "wolves", "zebra", "zebras"
    ],

    "Clothing": [
        "backpack", "backpacks", "belt", "belts", "beanie", "beanies", "blazer", "blazers", "blouse", "blouses",
        "boots", "bra", "bras", "briefs", "cape", "capes", "cardigan", "cardigans", "coat", "coats",
        "corset", "corsets", "cufflinks", "dress", "dresses", "earrings", "espadrilles", "flip-flops",
        "gown", "gowns", "glasses", "glove", "gloves", "hat", "hats", "handbag", "handbags", "heels", "helmet", "helmets", "hoodie", "hoodies",
        "jacket", "jackets", "jeans", "jumpsuit", "jumpsuits", "kimono", "kimonos", "leggings", "loafers", "mask", "masks", "mittens", "necklace", "necklaces",
        "overalls", "overcoat", "overcoats", "pants", "pajamas", "panties", "poncho", "ponchos", "purse", "purses", "raincoat", "raincoats",
        "ring", "rings", "robe", "robes", "sandal", "sandals", "satchel", "satchels", "scarf", "scarves", "shirt", "shirts",
        "shoe", "shoes", "shorts", "skirt", "skirts", "slipper", "slippers", "sneaker", "sneakers", "socks", "suit", "suits", "sunglasses", "sweater", "sweaters",
        "t-shirt", "t-shirts", "tank_top", "tank_tops", "thobe", "tie", "ties", "tights", "tracksuit", "tracksuits", "tunic", "tunics",
        "turban", "turbans", "tuxedo", "tuxedos", "uniform", "uniforms", "veil", "veils", "vest", "vests", "wallet", "wallets", "watch", "watches", "windbreaker", "windbreakers",
        "wristband", "wristbands"
    ],

    "Food": [
        "almond", "almonds", "apple", "apples", "avocado", "avocados", "artichoke", "asparagus", "bacon", "banana", "bananas", "bagel", "baguette", "barley", "basil", "beans", "beef", "blackberry", "blackberries", "blueberry", "blueberries", "bread", "broccoli", "burger", "burgers",
        "butter", "cabbage", "cake", "cakes", "candy", "candies", "carrot", "carrots", "caramel", "cashew", "cashews", "cauliflower", "cereal", "cherry", "cherries", "cheese", "chips", "chickpea",
        "chocolate", "cinnamon", "coconut", "coconuts", "coffee", "cookie", "cookies", "corn", "cracker", "crackers", "crepe", "croissant", "cucumber", "cucumbers", "donut", "donuts",
        "egg", "eggs", "eggplant", "eggplants", "fish", "fries", "garlic", "gelato", "ginger", "grape", "grapes", "grapefruit", "ham", "hamburger", "hamburgers", "hazelnut", "hazelnuts", "honey", "hotdog", "hotdogs",
        "ice_cream", "jam", "jelly", "juice", "ketchup", "kebab", "kiwi", "kiwis", "lasagna", "lentil", "licorice", "lemon", "lemons", "lettuce", "lime", "limes", "lobster", "lobsters", "macadamia", "macaroni", "macaron", "mayonnaise", "meatball", "mint", "mango", "mangos",
        "meat", "melon", "melons", "milk", "mousse", "muffin", "muffins", "mushroom", "mushrooms", "mustard", "noodle", "noodles", "nut", "nuts", "oat", "oats", "okra", "oregano", "oyster", "oatmeal", "olive", "olives",
        "onion", "onions", "orange", "oranges", "pancake", "pancakes", "pasta", "pastry", "peach", "peaches", "peanut", "peanuts", "pear", "pears", "peas", "pepper", "peppers", "pecan", "pesto", "pickle", "pistachio",
        "pie", "pies", "pineapple", "pineapples", "pizza", "plum", "plums", "pork", "popcorn", "potato", "potatoes", "pumpkin" "pretzel", "pretzels", "raisin", "raisins", "raspberry", "raspberries",
        "rice", "salad", "salmon", "sandwich", "sandwiches", "sausage", "sausages", "shrimp", "smoothie", "snack", "snacks", "soda", "soup", "spinach", "steak", "strawberry",
        "strawberries", "sugar", "syrup", "sushi", "sweet_potato", "taco", "tahini", "tea", "tomato", "tomatoes", "tofu", "tuna", "turkey", "tiramisu", "tortilla", "vinegar", "waffle", "waffles", "walnut", "walnuts", "water", "watermelon", "watermelons", "whipped_cream", "yogurt", "Yolk", "Zucchini"
    ],

    "Emotions": [
    "abandoned", "acrimonious", "addicted", "addicting", "addiction", "addict", "adoring", "adore", "affectionate", "afraid", "aggrieved",
    "agitated", "agonized", "agony", "alarmed", "alienated", "aloof", "amazed", "ambivalent", "amorous", "amused", "angry", "anger", 
    "anguished", "annoyed", "annoying", "anxious", "apathetic", "appalled", "appreciated", "apprehensive", "ardent", "ashamed", 
    "astonished", "attracted", "awed", "awe-struck", "awkward", "awkwardness", "bashful", "bemused", "bereaved", "betrayed", 
    "bewildered", "bitter", "blissful", "boastful", "bored", "boring", "brave", "broken_heart", "broken_hearted", "calm", 
    "cantankerous", "captivated", "caring", "cautious", "cheerful", "cherished", "claustrophobic", "clingy", "comfortable", 
    "compassionate", "complacent", "confident", "conflicted", "confused", "confusing", "contemplative", "contemptuous", "contrite", 
    "courageous", "cowardly", "cranky", "craving", "curious", "cynical", "defiant", "dejected", "delighted", "demoralized", "dependent", 
    "depressed", "depression", "deserted", "desirous", "desire", "despair", "despairing", "desperate", "desperation", "determined", 
    "devastated", "devastating", "disappointed", "disappointing", "discontented", "discouraged", "disgruntled", "disgust", 
    "disgusted", "disillusioned", "dismayed", "disoriented", "disparaged", "distracted", "distressed", "distraught", "disturbed", 
    "doubt", "doubtful", "downtrodden", "dreamy", "dubious", "eager", "ecstatic", "elated", "embarrassed", "emboldened", "emotional", 
    "empathetic", "enchanted", "encouraged", "energized", "energetic", "engrossed", "enraged", "enthusiastic", "enthralled", "envious", 
    "euphoric", "exasperated", "excited", "excluded", "exhausted", "exhilarated", "exploited", "exposed", "exuberant", "fascinated", 
    "fatigued", "fearful", "fearless", "feeling", "feel", "flustered", "forlorn", "fortunate", "frantic", "frightened", "frustrated", 
    "fulfilled", "furious", "giddy", "gleeful", "gloomy", "gracefull", "gracefully", "grateful", "greedy", "grief_stricken", "grumpy", 
    "guilt", "guilty", "happiness", "harassed", "hateful", "hated", "heartbroken", "helpless", "hesitant", "hopeful", "hopefully", 
    "hopeless", "horrified", "hostile", "humiliated", "humorous", "hungry", "hunger", "hurt", "hurting", "hysterical", "hysteria", "impatient", "in_love", 
    "indignant", "indifferent", "inferior", "infatuated", "insecure", "insignificant", "insulted", "intimidated", "intrigued", 
    "irritated", "isolated", "jealous", "jealously", "jittery", "joyful", "jovial", "jubilant", "kind", "languid", "lazy", "lethargic", 
    "liberated", "lively", "loathing", "lonely", "loneliness", "longful", "lost", "loved", "loving", "melancholic", "meltdown", 
    "merciful", "merry", "mindful", "miserable", "mistrustful", "moody", "mortified", "mournful", "mystified", "nervous", "nostalgic", 
    "numb", "obsessed", "offended", "open-hearted", "optimistic", "outraged", "overjoyed", "overwhelmed", "pacified", "panicked", 
    "panicky", "paranoid", "passionate", "patient", "patiently", "peaceful", "pensive", "perplexed", "persecuted", "pessimistic", 
    "petrified", "pining", "pitying", "playful", "pleased", "prideful", "privileged", "proud", "protective", "puzzled", "quiet", 
    "rage", "rapturous", "reassured", "rebellious", "regretful", "rejected", "relaxed", "relieved", "reluctant", "remorseful", 
    "resentful", "resigned", "respected", "restless", "revulsed", "ridiculous", "romantic", "sad", "sadness", "safe", "satisfied", 
    "scared", "scary", "scornful", "secure", "self-conscious", "sentimental", "serene", "shaken", "shame", "shameful", "shameless", 
    "shocked", "shy", "skeptical", "sleepy", "smug", "sorrow", "sorrowful", "spiteful", "startled", "stern", "stressed", "stressfull", 
    "stressfully", "strong", "stunned", "stupefied", "successful", "sullen", "surprised", "suspicious", "sympathetic", "tearful", 
    "tenacious", "tender", "tense", "tentative", "terrified", "thankful", "thoughtful", "threatened", "thrilled", "timid", "tired", 
    "tiredness", "touched", "tranquil", "triumphant", "troubled", "trusting", "uncomfortable", "unconfident", "unfulfilled", "unhappy", 
    "unnerved", "unsettled", "unstable", "uplifted", "upset", "valued", "vengeful", "vigilant", "vindicated", "vulnerable", "wary", 
    "weary", "wistful", "withdrawn", "woeful", "worried", "worthless", "wounded", "wrathful", "yearning", "zestful"
],

    "Body Parts": [
        "abdomen", "ankle", "ankles", "appendix", "arm", "arms", "artery", "arteries", "belly", "belly_button", "bladder", "blood", "bone", "bones", "brain",
        "calf", "calves", "cartilage", "cheek", "cheeks", "chest", "chin", "ear", "ears", "eardrum", "elbow", "elbows", "eye", "eyes",
        "eyebrow", "eyebrows", "eyelash", "eyelashes", "eyeball", "eyeballs", "finger", "fingers", "foot", "feet", "forehead", "gallbladder", "genital", "genitals", "groin", "gums", "hand", "hands",
        "hair", "head", "heel", "heels", "hips", "jaw", "kidney", "kidneys", "knee", "knees", "larynx", "leg", "legs", "ligament", "lip", "lips",
        "liver", "lung", "lungs", "mouth", "muscle", "muscles", "nail", "nails", "navel", "neck", "nerve", "nerves", "nostril", "nostrils", "ovary", "ovaries",
        "palms", "pancreas", "pelvis", "penis", "pupil", "retina", "rib", "ribs", "scalp", "scrotum", "shoulder", "shoulders", "shin", "shins", "skin",
        "skull", "spine", "spleen", "stomach", "teeth", "tendon", "thigh", "thighs", "throat", "thumb", "thumbs", "toe", "toes", "tongue", "tonsils",
        "tooth", "trachea", "ureter", "urethra", "uterus", "uvula", "vein", "veins", "vocal_cords", "waist", "wrist", "wrists"
    ]
}

# Define multi-word keywords to preserve as single tokens
multi_word_keywords = [
    "ice cream", "sweet potato", "whipped cream", "tank top", "tank tops", "in love", "belly button", "vocal cords", "broken hearted", "broken heart", "sea lion", "sea lions", "sea urchin", "sea urchins"
]
