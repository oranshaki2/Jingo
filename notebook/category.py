# Define categories and associated words
categories = {
    "Animals": [
        "alligator", "alligators", "ant", "ants", "antelope", "antelopes", "bat", "bats", "bear", "bears",
        "bee", "bees", "beetle", "beetles", "buffalo", "buffalos", "butterfly", "butterflies", "camel", "camels",
        "cat", "cats", "caterpillar", "caterpillars", "cheetah", "cheetahs", "chicken", "chickens", "chimpanzee", "chimpanzees",
        "cow", "cows", "crab", "crabs", "crocodile", "crocodiles", "deer", "dog", "dogs", "dolphin", "dolphins",
        "donkey", "donkeys", "duck", "ducks", "eagle", "eagles", "elephant", "elephants", "falcon", "falcons", "ferret", "ferrets",
        "fish", "flamingo", "flamingos", "fox", "foxes", "frog", "frogs", "giraffe", "giraffes", "goat", "goats",
        "goose", "geese", "gorilla", "gorillas", "grasshopper", "grasshoppers", "hamster", "hamsters", "hawk", "hawks", "hedgehog", "hedgehogs",
        "hippo", "hippos", "horse", "horses", "hyena", "hyenas", "jaguar", "jaguars", "jellyfish", "kangaroo", "kangaroos", "koala", "koalas",
        "leopard", "leopards", "lion", "lions", "lizard", "lizards", "lobster", "lobsters", "llama", "llamas", "mole", "moles", "monkey", "monkeys",
        "moose", "mosquito", "mosquitoes", "mouse", "mice", "octopus", "octopuses", "ostrich", "ostriches", "otter", "otters", "owl", "owls",
        "ox", "oxen", "panda", "pandas", "parrot", "parrots", "peacock", "peacocks", "pelican", "pelicans", "penguin", "penguins", "pig", "pigs",
        "pigeon", "pigeons", "platypus", "platypuses", "porcupine", "porcupines", "rabbit", "rabbits", "raccoon", "raccoons", "rat", "rats", "raven", "ravens",
        "reindeer", "rhino", "rhinos", "seal", "seals", "seahorse", "seahorses", "shark", "sharks", "sheep", "skunk", "skunks", "sloth", "sloths",
        "snail", "snails", "snake", "snakes", "sparrow", "sparrows", "spider", "spiders", "squid", "squids", "squirrel", "squirrels", "starfish", "stingray", "stingrays",
        "swan", "swans", "termite", "termites", "tiger", "tigers", "toad", "toads", "toucan", "toucans", "turtle", "turtles", "walrus", "walruses",
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
    "afraid", "agitated", "alienated", "amused", "angry", "annoyed", "anxious", "apathetic", "apprehensive", "ashamed", "awe-struck",
    "bewildered", "blissful", "bored", "brave", "calm", "caring", "cheerful", "compassionate", "confident", "confused", "cowardly",
    "curious", "delighted", "depressed", "despairing", "determined", "discouraged", "disappointed", "distraught", "doubtful", 
    "ecstatic", "elated", "embarrassed", "emotional", "energized", "enthusiastic", "envious", "excited", "exhausted", "exhilarated", 
    "fearful", "flustered", "frustrated", "furious", "giddy", "gloomy", "grateful", "grumpy", "guilty", "happy", "heartbroken", 
    "hesitant", "hopeful", "hopeless", "horrified", "hostile", "humiliated", "impatient", "in_love", "indignant", "indifferent", 
    "insecure", "irritated", "jealous", "joyful", "jubilant", "kind", "lazy", "lively", "lonely", "loved", "melancholic", "meltdown", 
    "miserable", "moody", "nervous", "nostalgic", "nurturing", "open-hearted", "optimistic", "overjoyed", "overwhelmed", 
    "panicked", "panicky", "passionate", "patient", "peaceful", "pensive", "pessimistic", "pleased", "proud", "quiet", "regretful", 
    "relaxed", "relieved", "resentful", "revulsed", "romantic", "satisfied", "scared", "sentimental", "serene", "shaken", "shy", 
    "skeptical", "smug", "stern", "strong", "stunned", "surprised", "sympathetic", "tearful", "tense", "terrified", "thoughtful", 
    "thrilled", "tired", "touched", "tranquil", "trusting", "uncomfortable", "unhappy", "uplifted", "upset", "vulnerable", "wistful", 
    "worried", "yearning"
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
    "ice cream", "sweet potato", "whipped cream", "tank top", "tank tops", "in love", "belly button", "vocal cords"
]
