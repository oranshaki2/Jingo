# ambiguity_detector.py

import requests
import json
import csv
import ast
import asyncio
import aiohttp
import time
import re
import os

async def check_ambiguity_async(lyrics, categories, category_words, api_key, session):
    """
    Use Grok-3 API to check which words in the lyrics match their respective categories.
    Returns a list of lists, one list per category, containing only the words that clearly match the category's meaning in the lyrics.
    """
    category_word_pairs = [f"category '{cat}' with words [{', '.join(words)}]" for cat, words in zip(categories, category_words)]
    prompt = f"In the following lyrics: \n'{lyrics}'\n, you are given category-word pairs: {'; '.join(category_word_pairs)}. Return a modified list of category-word pairs where only the words that clearly match the meaning used in the lyrics remain in their respective categories. Remove any word that does not fit the category based on its usage in the lyrics. Format your answer strictly as a list of lists—one list per category, in the same order as the input, with all words as quoted strings (e.g., [['word1', 'word2'], ['word3']]). Do not add explanations or extra text."

    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }
    data = {
        'model': 'grok-3-mini-beta',
        'messages': [{'role': 'user', 'content': prompt}],
        'temperature': 0.0
    }

    try:
        async with session.post('https://api.x.ai/v1/chat/completions', headers=headers, json=data) as response:
            response_json = await response.json()
            if 'choices' not in response_json:
                print(f"Error processing lyrics: {lyrics[:50]}... API response missing 'choices' key. Response: {response_json}")
                return category_words  # Return original words on error
            result = response_json['choices'][0]['message']['content'].strip()
            try:
                # Preprocess the response to add quotes around unquoted words
                result = re.sub(r'\b(\w+)\b(?=[\],])', r'"\1"', result)
                # Parse the preprocessed response as a Python literal
                filtered_words = ast.literal_eval(result)
                if not isinstance(filtered_words, list) or not all(isinstance(sublist, list) for sublist in filtered_words) or not all(
                    all(isinstance(word, str) for word in sublist) for sublist in filtered_words
                ):
                    print(f"Error: Invalid response format for lyrics: {lyrics[:50]}... Response: {result}")
                    return category_words
                return filtered_words
            except (ValueError, SyntaxError) as e:
                print(f"Error parsing API response for lyrics: {lyrics[:50]}... Response: {result}, Error: {e}")
                return category_words
    except Exception as e:
        print(f"Error processing lyrics: {lyrics[:50]}... Error: {e}")
        return category_words

async def process_batch(batch, api_key):
    """
    Process a batch of lyrics asynchronously with a delay between requests.
    """
    async with aiohttp.ClientSession() as session:
        tasks = []
        for row in batch:
            lyrics = row['cleaned_lyrics']
            categories = row['categories']
            category_words = row['category_words']
            tasks.append(check_ambiguity_async(lyrics, categories, category_words, api_key, session))
        results = await asyncio.gather(*tasks)
        return results

def get_processed_count(output_file):
    """
    Count the number of data rows in the output CSV (excluding header).
    Returns the number of processed rows.
    """
    processed_count = 0
    if os.path.exists(output_file):
        with open(output_file, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            next(reader, None)  # Skip header
            for row in reader:
                if row:  # Count non-empty rows
                    processed_count += 1
    return processed_count

def process_ambiguity(sentences_tags, api_key, sample_size=None):
    """
    Process a list of dictionaries containing song data to check ambiguity using Grok-3 API.
    Outputs each song with all original columns plus the filtered category words in a new 'Filtered Words' column.
    Processes data in batches of 10 asynchronously and writes results to a CSV file after each batch.
    If sample_size is provided, only process the first `sample_size` unprocessed rows.
    Adds a newline (\n) to the end of cleaned_lyrics for readability in the output CSV.
    Resumes processing from the last row written to the output CSV.
    """
    batch_size = 10
    loop = asyncio.get_event_loop()
    output_file = '../data/ambiguity_results1.csv'

    # Get number of processed rows
    processed_count = get_processed_count(output_file)
    print(f"Processed so far: {processed_count}")

    # Skip already processed rows
    unprocessed_tags = sentences_tags[processed_count:]
    print(f"Total unprocessed rows: {len(unprocessed_tags)}")

    # Limit the number of rows to process if sample_size is specified
    if sample_size is not None:
        unprocessed_tags = unprocessed_tags[:sample_size]

    if not unprocessed_tags:
        print("No unprocessed rows to process.")
        return

    # Write header to CSV file only if it doesn't exist
    file_exists = os.path.exists(output_file)
    with open(output_file, 'a' if file_exists else 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(['Song', 'Artist', 'Genre', 'categories', 'category_words', 'cleaned_lyrics', 'Filtered Words'])

        for i in range(0, len(unprocessed_tags), batch_size):
            batch = unprocessed_tags[i:i + batch_size]
            print(f"Processing batch {i//batch_size + 1} of {(len(unprocessed_tags) + batch_size - 1)//batch_size}")
            results = loop.run_until_complete(process_batch(batch, api_key))
            
            # Write batch results to CSV file
            for row, filtered_words in zip(batch, results):
                # Append \n to cleaned_lyrics for readability
                lyrics_with_newline = row['cleaned_lyrics'] + '\n'
                writer.writerow([
                    row['Song'],
                    row['Artist'],
                    row['Genre'],
                    row['categories'],
                    row['category_words'],
                    filtered_words,
                    lyrics_with_newline
                    
                ])
                if filtered_words != row['category_words']:  # Log only if words were filtered
                    print(f"{row['cleaned_lyrics']} : Category: {row['categories']}, Original Words: {row['category_words']}, Filtered Words: {filtered_words}")

def extract_sentences_and_tags(file_path):
    """
    Read song data from a CSV file and extract all columns.
    Returns a list of dictionaries with all columns: Song, Artist, Genre, categories, category_words, cleaned_lyrics.
    """
    results = []
    with open(file_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            # Parse categories and category_words as Python objects
            row['categories'] = ast.literal_eval(row['categories'])
            row['category_words'] = ast.literal_eval(row['category_words'])
            results.append({
                'Song': row['Song'],
                'Artist': row['Artist'],
                'Genre': row['Genre'],
                'categories': row['categories'],
                'category_words': row['category_words'],
                'cleaned_lyrics': row['cleaned_lyrics'].strip()
            })
    return results

if __name__ == '__main__':
    api_key = "xai-gEBMNRWxFbzqqbihsslwFNeVVmgfyPc916409CwAUHrc7Jtwifxgi37u0PKbR8MUIAGSsWcA5nCwohy2"
    file_path = "../data/songs_for_api_tran4.csv"
    sentences_tags = extract_sentences_and_tags(file_path)
    process_ambiguity(sentences_tags, api_key) 