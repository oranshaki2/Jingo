import json
from nltk.corpus import wordnet as wn
# from deep_translator import LibreTranslator
import nltk
import time
import requests

nltk.download('wordnet')
nltk.download('omw-1.4')

# translator = LibreTranslator(source='en', target='he', api_url='https://libretranslate.de/translate')
# פונקציה לתרגום טקסט באמצעות LibreTranslate
def translate_text(text, source_language, target_language):
    url = "https://libretranslate.com/translate"  # שרת אחר
    payload = {
        'q': text,
        'source': source_language,
        'target': target_language,
        'format': 'text'
    }
    response = requests.post(url, data=payload)
    return response.json()['translatedText']

# פונקציה שמביאה את המשמעויות של המילה ומתרגמת כל אחת מהן
def get_senses_and_translations(word):
    sense_dict = {}
    for syn in wn.synsets(word):
        definition = syn.definition()
        if definition not in sense_dict:
            try:
                # תרגום המשמעות של המילה
                translation = translate_text(definition, 'en', 'he')
                sense_dict[definition] = translation
                time.sleep(0.3)  # השהייה קטנה כדי לא להעמיס
            except Exception as e:
                print(f"שגיאה בתרגום '{definition}': {e}")
                sense_dict[definition] = "❓"
    return sense_dict

def build_translation_dict(word_list, output_file="translation_dict.json"):
    full_dict = {}
    for word in word_list:
        print(f"🔍 מתרגם: {word}")
        senses = get_senses_and_translations(word)
        full_dict[word] = senses
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(full_dict, f, ensure_ascii=False, indent=2)
    print(f"\n✅ נשמר הקובץ: {output_file}")

# 🧪 דוגמה לשימוש:
words = ["coat", "fish", "fly", "mask"]
build_translation_dict(words)
