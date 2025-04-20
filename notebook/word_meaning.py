from sentence_transformers import SentenceTransformer, util

# מודל להבנה סמנטית
model = SentenceTransformer('all-MiniLM-L6-v2')

# אפשרויות פירוש של המילה "coat" עם תרגום לעברית
senses = {
    "a layer of something (like paint or nail polish)": "שכבה",
    "an outer garment worn for warmth": "מעיל",
    "a layer of fur, hair, or wool on an animal": "פרווה של חיה",
    "to cover something with a layer of substance": "לצפות בשכבה"
}

def get_word_meaning(sentence, word):
    # חשב embedding למשפט
    sentence_embedding = model.encode(sentence, convert_to_tensor=True)
    
    best_score = -1
    best_meaning = ""
    
    for definition, hebrew in senses.items():
        definition_embedding = model.encode(definition, convert_to_tensor=True)
        score = util.cos_sim(sentence_embedding, definition_embedding).item()
        
        if score > best_score:
            best_score = score
            best_meaning = f"{word} בהקשר הזה משמעה: '{hebrew}' ({definition})"
    
    return best_meaning

# 🔍 דוגמה:
sentence = "She put another coat on her nails"
word = "coat"

meaning = get_word_meaning(sentence, word)
print(meaning)
