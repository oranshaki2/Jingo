# =============================================================================
# Ambiguity Detector
# =============================================================================
# This script checks whether the words we matched to a song's category
# (e.g. "dog" → Animals, "shirt" → Clothing) are actually used in the
# song with the intended meaning.
#
# The problem: a word like "broken" could match the "Emotions" category,
# but in the lyrics it might refer to a broken guitar string — not an emotion.
# We call that a "false match" or ambiguous match.
#
# How it works:
#   1. Load songs from a CSV. Each song already has 'categories' and
#      'category_words' columns (produced by earlier pipeline steps).
#   2. For each song, send its lyrics + matched words to the Grok AI API.
#   3. The AI returns a cleaned list: only words that truly match the
#      category's meaning in *this* song.
#   4. Save the filtered results to a new CSV for the next pipeline step.
#
# The script processes songs in batches and can resume from where it left
# off if it is stopped mid-way (it counts already-written rows and skips them).
# =============================================================================

import requests
import json
import csv
import ast
import asyncio
import aiohttp
import time
import re
import os
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Configuration constants
# Change these values to adjust behaviour without touching the logic below.
# ---------------------------------------------------------------------------
MODEL_NAME = 'grok-3-mini-beta'          # Grok AI model to use
API_URL = 'https://api.x.ai/v1/chat/completions'  # Grok API endpoint
API_TEMPERATURE = 0.0                    # 0 = deterministic / no creativity (we want consistent answers)
BATCH_SIZE = 10                          # How many songs to send to the API at once
OUTPUT_FILE = '../../data/ambiguity_results1.csv'  # Where to save the filtered results
OUTPUT_COLUMNS = ['Song', 'Artist', 'Genre', 'categories', 'category_words', 'cleaned_lyrics', 'Filtered Words']
LYRICS_PREVIEW_LENGTH = 50              # Characters of lyrics shown in error messages (keeps logs short)
LYRICS_NEWLINE_SUFFIX = '\n'            # Added to lyrics in the CSV so each song is visually separated
INPUT_FILE = "../../data/songs_for_api_tran4.csv"  # Song data produced by earlier pipeline steps


# ---------------------------------------------------------------------------
# Core API function
# ---------------------------------------------------------------------------

async def check_ambiguity_async(lyrics, categories, category_words, api_key, session):
    """
    Ask the Grok AI whether each matched word is truly used with the
    expected category meaning inside this specific song's lyrics.

    For example, if the word "rose" was matched to the "Plants" category
    but the lyrics say "I rose above the clouds", the AI should remove
    "rose" because it is used as a verb here, not as a flower.

    Args:
        lyrics (str):        The cleaned song lyrics (one long string).
        categories (list):   Category names, e.g. ['Animals', 'Clothing'].
        category_words (list): Parallel list of word lists,
                               e.g. [['dog', 'bird'], ['shirt']].
        api_key (str):       Secret key to authenticate with the Grok API.
        session (aiohttp.ClientSession): Shared async HTTP connection pool.

    Returns:
        list: Filtered version of category_words — same structure, but
              words that don't fit the category in context are removed.
              Returns the original category_words unchanged if an error occurs.
    """
    # Build a human-readable description of each category and its matched words,
    # e.g. "category 'Animals' with words [dog, bird]"
    category_word_pairs = [f"category '{cat}' with words [{', '.join(words)}]" for cat, words in zip(categories, category_words)]

    # The prompt tells the AI to act as a filter:
    # keep a word only if it is actually used with the category's meaning in these lyrics.
    # We ask for the answer in a strict list-of-lists format so we can parse it reliably.
    prompt = f"In the following lyrics: \n'{lyrics}'\n, you are given category-word pairs: {'; '.join(category_word_pairs)}. Return a modified list of category-word pairs where only the words that clearly match the meaning used in the lyrics remain in their respective categories. Remove any word that does not fit the category based on its usage in the lyrics. Format your answer strictly as a list of lists—one list per category, in the same order as the input, with all words as quoted strings (e.g., [['word1', 'word2'], ['word3']]). Do not add explanations or extra text."

    # Standard headers required by the Grok API
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }
    # Request body: which model, the prompt, and how "creative" the answer should be
    data = {
        'model': MODEL_NAME,
        'messages': [{'role': 'user', 'content': prompt}],
        'temperature': API_TEMPERATURE  # 0 = fully deterministic, no randomness
    }

    try:
        # Send the HTTP request asynchronously and wait for the AI's response
        async with session.post(API_URL, headers=headers, json=data) as response:
            response_json = await response.json()

            # If the API returned an error or unexpected format, bail out safely
            if 'choices' not in response_json:
                print(f"Error processing lyrics: {lyrics[:LYRICS_PREVIEW_LENGTH]}... API response missing 'choices' key. Response: {response_json}")
                return category_words  # Return original words unchanged on error

            # Extract the text the AI wrote back
            result = response_json['choices'][0]['message']['content'].strip()
            try:
                # The AI sometimes writes words without quotes; this regex adds them
                # so Python's parser can handle the list correctly
                result = re.sub(r'\b(\w+)\b(?=[\],])', r'"\1"', result)

                # Convert the text "[['dog'], ['shirt']]" into an actual Python list
                filtered_words = ast.literal_eval(result)

                # Validate the structure: must be a list of lists of strings.
                # The AI might occasionally return something unexpected, so we check.
                if not isinstance(filtered_words, list) or not all(isinstance(sublist, list) for sublist in filtered_words) or not all(
                    all(isinstance(word, str) for word in sublist) for sublist in filtered_words
                ):
                    print(f"Error: Invalid response format for lyrics: {lyrics[:LYRICS_PREVIEW_LENGTH]}... Response: {result}")
                    return category_words

                return filtered_words
            except (ValueError, SyntaxError) as e:
                # The AI returned something we could not parse — keep the original words
                print(f"Error parsing API response for lyrics: {lyrics[:LYRICS_PREVIEW_LENGTH]}... Response: {result}, Error: {e}")
                return category_words
    except Exception as e:
        # Network error or any other unexpected failure
        print(f"Error processing lyrics: {lyrics[:LYRICS_PREVIEW_LENGTH]}... Error: {e}")
        return category_words



# ---------------------------------------------------------------------------
# Batch processing
# ---------------------------------------------------------------------------

async def process_batch(batch, api_key):
    """
    Send a batch of songs to the AI concurrently and collect the results.

    Instead of checking one song at a time (which would be slow), we fire
    off all requests in the batch at the same time and wait for all of them
    to finish before returning. This is what 'async/await' is for here.

    Args:
        batch (list):   A slice of the song list. Each item is a dict with keys:
                        'cleaned_lyrics', 'categories', 'category_words',
                        plus metadata ('Song', 'Artist', 'Genre').
        api_key (str):  Secret key to authenticate with the Grok API.

    Returns:
        list: One filtered category_words entry per song in the batch,
              in the same order as the input batch.
    """
    # A single shared HTTP connection pool reused by all requests in this batch
    async with aiohttp.ClientSession() as session:
        tasks = []
        for row in batch:
            lyrics = row['cleaned_lyrics']
            categories = row['categories']
            category_words = row['category_words']
            # Schedule the async check — does not start running yet
            tasks.append(check_ambiguity_async(lyrics, categories, category_words, api_key, session))
        # Launch all tasks at the same time and wait until every one completes
        results = await asyncio.gather(*tasks)
        return results



# ---------------------------------------------------------------------------
# Resume / progress helpers
# ---------------------------------------------------------------------------

def get_processed_count(output_file):
    """
    Count how many songs have already been saved to the output CSV.

    This lets the script resume after a crash or interruption without
    re-processing songs that were already checked.

    Args:
        output_file (str): Path to the output CSV that may already exist.

    Returns:
        int: Number of data rows (not counting the header line).
             Returns 0 if the file does not exist yet.
    """
    processed_count = 0
    if os.path.exists(output_file):
        with open(output_file, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            next(reader, None)  # Skip the header row — we only want data rows
            for row in reader:
                if row:  # Ignore blank lines
                    processed_count += 1
    return processed_count



# ---------------------------------------------------------------------------
# Main processing orchestrator
# ---------------------------------------------------------------------------

def process_ambiguity(sentences_tags, api_key, sample_size=None):
    """
    Main function that drives the whole ambiguity-filtering pipeline.

    Steps:
      1. Check the output CSV to see how many songs were already processed.
      2. Skip those songs so we never duplicate work (resume support).
      3. Process the remaining songs in batches, calling the AI for each one.
      4. Append each batch's results to the output CSV immediately, so
         progress is saved even if the script is interrupted mid-run.

    Args:
        sentences_tags (list): All songs loaded from the input CSV.
        api_key (str):         Secret key to authenticate with the Grok API.
        sample_size (int, optional): If given, only process this many songs
                                     (useful for quick testing / debugging).
    """
    # asyncio event loop — needed to run async code from inside a normal function
    loop = asyncio.get_event_loop()
    output_file = OUTPUT_FILE

    # --- Resume support -------------------------------------------------
    # Count how many songs are already in the output file
    processed_count = get_processed_count(output_file)
    print(f"Processed so far: {processed_count}")

    # Slice the input list to start right after the last saved song
    unprocessed_tags = sentences_tags[processed_count:]
    print(f"Total unprocessed rows: {len(unprocessed_tags)}")

    # Optional: cap the number of songs to process in this run
    if sample_size is not None:
        unprocessed_tags = unprocessed_tags[:sample_size]

    if not unprocessed_tags:
        print("No unprocessed rows to process.")
        return

    # --- Output CSV setup -----------------------------------------------
    # Open in append mode if the file already exists (resuming a previous run),
    # or write mode if it's brand new (write the header first).
    file_exists = os.path.exists(output_file)
    with open(output_file, 'a' if file_exists else 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(OUTPUT_COLUMNS)  # Write column headers on the very first run

        # --- Batch loop -------------------------------------------------
        for i in range(0, len(unprocessed_tags), BATCH_SIZE):
            batch = unprocessed_tags[i:i + BATCH_SIZE]
            print(f"Processing batch {i//BATCH_SIZE + 1} of {(len(unprocessed_tags) + BATCH_SIZE - 1)//BATCH_SIZE}")

            # Send this batch to the AI and receive the filtered word lists
            results = loop.run_until_complete(process_batch(batch, api_key))

            # Write each song's result to the CSV immediately after the batch finishes
            for row, filtered_words in zip(batch, results):
                # Add a newline after lyrics so rows are visually separated when reading the CSV
                lyrics_with_newline = row['cleaned_lyrics'] + LYRICS_NEWLINE_SUFFIX
                writer.writerow([
                    row['Song'],
                    row['Artist'],
                    row['Genre'],
                    row['categories'],
                    row['category_words'],
                    filtered_words,
                    lyrics_with_newline
                ])
                # Only print to console when words actually changed (reduces noise in logs)
                if filtered_words != row['category_words']:
                    print(f"{row['cleaned_lyrics']} : Category: {row['categories']}, Original Words: {row['category_words']}, Filtered Words: {filtered_words}")



# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def extract_sentences_and_tags(file_path):
    """
    Load the input CSV and convert each row into a structured Python dictionary.

    The CSV stores 'categories' and 'category_words' as text representations
    of Python lists (e.g. "['Animals', 'Food']"). ast.literal_eval() safely
    converts them back to real Python lists so the rest of the code can use
    them directly without any string parsing.

    Args:
        file_path (str): Path to the input CSV file.

    Returns:
        list: One dictionary per song with keys:
              'Song', 'Artist', 'Genre', 'categories',
              'category_words', 'cleaned_lyrics'.
    """
    results = []
    with open(file_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)  # Each row becomes a dict keyed by column name
        for row in reader:
            # The CSV stores these columns as plain text; convert them back to Python lists
            row['categories'] = ast.literal_eval(row['categories'])
            row['category_words'] = ast.literal_eval(row['category_words'])
            results.append({
                'Song': row['Song'],
                'Artist': row['Artist'],
                'Genre': row['Genre'],
                'categories': row['categories'],
                'category_words': row['category_words'],
                'cleaned_lyrics': row['cleaned_lyrics'].strip()  # Remove leading/trailing whitespace
            })
    return results

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == '__main__':
    # Load the GROK3_API_KEY from a .env file in the project root.
    # The key is kept in a separate file so it is never accidentally
    # committed to version control.
    load_dotenv()
    api_key = os.getenv('GROK3_API_KEY')
    if not api_key:
        raise ValueError("GROK3_API_KEY not found in .env file")

    # Step 1: Read all songs from the input CSV into a list of dicts
    file_path = INPUT_FILE
    sentences_tags = extract_sentences_and_tags(file_path)

    # Step 2: Run the ambiguity check and save filtered results.
    # Songs already saved in the output file are automatically skipped.
    process_ambiguity(sentences_tags, api_key)