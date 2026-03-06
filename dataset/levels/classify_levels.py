# =============================================================================
# CEFR Level Classifier
# =============================================================================
# This script assigns a difficulty level to the vocabulary words that were
# previously matched to each song's categories (e.g. Animals, Clothing…).
#
# Background — CEFR levels:
#   CEFR (Common European Framework of Reference) is an international
#   language-learning standard with six levels. We group them into three:
#     Level 1 → A (A1/A2): beginner words, e.g. "sad", "dog"
#     Level 2 → B (B1/B2): intermediate words, e.g. "frustrated", "sprint"
#     Level 3 → C (C1/C2): advanced words, e.g. "melancholy", "metamorphosis"
#
# How it works:
#   1. Load songs from a CSV. Each song has a 'category_words' column that
#      contains lists of vocabulary words grouped by category.
#   2. For each sublist of category words, ask the Grok AI API: "what CEFR
#      level is each of these words?"
#   3. The overall level for a song is the *highest* level returned for any
#      word (e.g. if one word is A and another is C, the song gets level 3).
#   4. Save the results (original data + a new 'Level' column) to a CSV.
#
# The script processes songs in batches and can resume from where it left
# off if stopped mid-way (it counts already-written rows and skips them).
# =============================================================================

import pandas as pd
import asyncio
import aiohttp
import ast
import os
from dotenv import load_dotenv
import csv

# ---------------------------------------------------------------------------
# Configuration constants
# Change these values to adjust behaviour without touching the logic below.
# ---------------------------------------------------------------------------
MODEL_NAME = 'grok-3-mini-beta'          # Grok AI model to use
API_URL = 'https://api.x.ai/v1/chat/completions'  # Grok API endpoint
API_TEMPERATURE = 0.0                    # 0 = deterministic / no creativity (we want consistent answers)
VALID_LEVEL_TOKENS = {'1', '2', '3'}     # The only values the API is allowed to return for a level
DEFAULT_EMPTY_RESULT = [[None]]          # Used when a row has no category_words to classify
BATCH_SIZE = 10                          # How many songs to send to the API at once
OUTPUT_COLUMNS = ['Song', 'Artist', 'Genre', 'categories', 'category_words', 'Level']

INPUT_FILE = '../../data/filtered_songs_three1.csv'   # Songs with category_words to classify
OUTPUT_FILE = '../../data/song_lyrics_with_levels.csv'  # Where to save the results


# ---------------------------------------------------------------------------
# Core API function
# ---------------------------------------------------------------------------

async def classify_words_async(words, api_key, session):
    """
    Ask the Grok AI to rate each word in `words` on a 1-3 CEFR difficulty scale.

    The AI looks at every word, decides its CEFR band (A/B/C), and returns a
    number per word.  We then take the *maximum* — so if a song has even one
    advanced word, the whole song gets a high level.  This reflects the idea
    that a learner must understand every word in a song to use it comfortably.

    Args:
        words (list):  A flat list of vocabulary words, e.g. ['dog', 'sprint'].
        api_key (str): Secret key to authenticate with the Grok API.
        session (aiohttp.ClientSession): Shared async HTTP connection pool.

    Returns:
        int | None: The highest level found (1, 2, or 3), or None if the API
                    call fails or returns an unrecognisable response.
    """
    # Build the instruction prompt — we include level examples to guide the AI
    prompt = f"Classify each word or phrase in the following list into one of three CEFR (Common European Framework of Reference for Languages) difficulty levels based on their complexity and common usage: {words}. " \
             f"Level A (A1/A2): basic, common words or phrases understandable by beginners (e.g., 'sad', 'win'). " \
             f"Level B (B1/B2): intermediate words or phrases requiring moderate language proficiency (e.g., 'satisfied', 'kick'). " \
             f"Level C (C1/C2): advanced, complex, or less common words/phrases used by proficient speakers (e.g., 'numb', 'doubt'). " \
             f"Return a list of level numbers (1 for A, 2 for B, 3 for C) with exactly one number per word or phrase in the input list, in the same order, e.g., for ['sad', 'numb'], return [1, 3]. Ensure the output list length matches the input list length."

    # Standard headers required by the Grok API
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }
    # Request body: model choice, the prompt, and creativity setting
    data = {
        'model': MODEL_NAME,
        'messages': [{'role': 'user', 'content': prompt}],
        'temperature': API_TEMPERATURE  # 0 = fully deterministic, no randomness
    }

    try:
        # Send the request asynchronously and wait for the AI's response
        async with session.post(API_URL, headers=headers, json=data) as response:
            response_json = await response.json()

            # Bail out safely if the API returned an error or unexpected structure
            if 'choices' not in response_json:
                print(f"Error processing words: {words}. API response missing 'choices' key. Response: {response_json}")
                return None

            # Extract the text the AI wrote back (e.g. "[1, 3, 2]")
            result = response_json['choices'][0]['message']['content'].strip()
            try:
                # Normalise the response: remove brackets/commas and split into tokens
                # This handles both "[1, 2, 3]" and "1 2 3" style answers
                result = result.replace(',', ' ').strip('[]').split()

                # Keep only tokens that are valid level numbers (1, 2, or 3)
                levels = [int(x) for x in result if x in VALID_LEVEL_TOKENS]
                if not levels:
                    print(f"Invalid level returned for words: {words}. Response: {result}")
                    return None

                print(f"words: {words}-> Levels: {levels}")
                # Return the hardest level found — the song rating is its most difficult word
                return max(levels)
            except (ValueError, SyntaxError):
                # Sometimes the AI returns a single digit without a list; handle that too
                if result in VALID_LEVEL_TOKENS:
                    return int(result)
                print(f"Invalid level returned for words: {words}. Response: {result}")
                return None
    except Exception as e:
        # Network error or any other unexpected failure
        print(f"Error processing words: {words}. Error: {e}")
        return None


# ---------------------------------------------------------------------------
# Batch processing helpers
# ---------------------------------------------------------------------------

async def process_sublists(sublists, api_key, session):
    """
    Classify every sublist of category words for a single song concurrently.

    A song's 'category_words' looks like: [['dog', 'cat'], ['shirt', 'hat']]
    — one sub-list per matched category.  We classify each sub-list in
    parallel, then attach the returned level to the end of each sub-list so
    the caller gets back e.g. [['dog', 'cat', 1], ['shirt', 'hat', 2]].

    Args:
        sublists (list):  List of word lists, one per category.
        api_key (str):    Secret key to authenticate with the Grok API.
        session (aiohttp.ClientSession): Shared async HTTP connection pool.

    Returns:
        list: Same structure as `sublists` but with the level appended to
              each inner list.  If classification fails for a sublist,
              None is appended instead of a number.
    """
    # Schedule all sub-lists to be classified at the same time
    tasks = [classify_words_async(sublist, api_key, session) for sublist in sublists]
    levels = await asyncio.gather(*tasks)

    # Append the level (or None on failure) to each word sub-list
    return [sublist + [level] if level is not None else sublist + [None] for sublist, level in zip(sublists, levels)]


async def process_batch(batch, api_key):
    """
    Classify the category words for every song in a batch, all concurrently.

    Each row's 'category_words' column is parsed from its stored text form
    (e.g. "[['dog'], ['shirt']]") back into a Python list before being sent
    to the API.  Rows with missing or unparseable data are given a safe
    default result and skipped without crashing the whole batch.

    Args:
        batch (DataFrame): A slice of the full songs DataFrame.
        api_key (str):     Secret key to authenticate with the Grok API.

    Returns:
        list: One result per row — each result is a list of sub-lists,
              where each sub-list contains the original words + the level.
    """
    # A single shared HTTP connection pool reused by all requests in this batch
    async with aiohttp.ClientSession() as session:
        tasks = []
        for row in batch.itertuples(index=False):
            try:
                category_words_str = getattr(row, 'category_words', None)
                if not category_words_str:
                    # Row has no words to classify — skip with a null placeholder
                    print(f"No category_words found for row: {row}")
                    tasks.append(asyncio.ensure_future(asyncio.sleep(0, result=DEFAULT_EMPTY_RESULT)))
                    continue

                # The CSV stores category_words as text; convert it back to a Python list
                category_words = ast.literal_eval(category_words_str)

                # Validate: must be a list of lists (one per category)
                if not isinstance(category_words, list) or not all(isinstance(sublist, list) for sublist in category_words):
                    print(f"Invalid category_words format for row: {category_words_str}")
                    tasks.append(asyncio.ensure_future(asyncio.sleep(0, result=[[None] * (len(category_words) + 1)])))
                    continue

            except (ValueError, SyntaxError) as e:
                # Unparseable text in the category_words column — skip this row safely
                print(f"Error parsing category_words: {category_words_str}. Error: {e}")
                tasks.append(asyncio.ensure_future(asyncio.sleep(0, result=DEFAULT_EMPTY_RESULT)))
                continue

            # Schedule classification for all sub-lists in this row concurrently
            tasks.append(process_sublists(category_words, api_key, session))

        # Wait for all tasks to complete and collect results
        return await asyncio.gather(*tasks)


# ---------------------------------------------------------------------------
# Resume / progress helper
# ---------------------------------------------------------------------------

def get_processed_count(output_file):
    """
    Count how many songs have already been saved to the output CSV.

    This lets the script resume after a crash or interruption without
    re-classifying songs that were already done.

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

def process_category_words(input_file, output_file, api_key, sample_size=None):
    """
    Main function that drives the entire CEFR-level classification pipeline.

    Steps:
      1. Load the input CSV and verify it has a 'category_words' column.
      2. Check the output CSV to see how many songs were already classified.
      3. Skip those songs (resume support — safe to stop and restart at any time).
      4. Process the remaining songs in batches, calling the AI for each one.
      5. Write each batch's results to the output CSV immediately so no work
         is lost if the script is interrupted.

    Args:
        input_file (str):  Path to the input CSV file.
        output_file (str): Path where results will be saved.
        api_key (str):     Secret key to authenticate with the Grok API.
        sample_size (int, optional): If given, only process this many songs
                                     (useful for quick testing / debugging).
    """
    # Load the full dataset into a DataFrame
    try:
        df = pd.read_csv(input_file)
    except Exception as e:
        raise ValueError(f"Failed to read input CSV {input_file}: {e}")

    # Sanity check: the column we need must be present
    if 'category_words' not in df.columns:
        raise ValueError("Input CSV must contain a 'category_words' column")

    # --- Resume support -------------------------------------------------
    # How many songs are already in the output file?
    file_exists = os.path.exists(output_file)
    processed_count = get_processed_count(output_file) if file_exists else 0
    print(f"Output file {'exists' if file_exists else 'does not exist'}. Processed so far: {processed_count}")

    # Slice the DataFrame so we start right after the last saved song
    rows_to_process = df[processed_count:]
    print(f"Total unprocessed rows: {len(rows_to_process)}")

    # Optional: cap the number of songs to process in this run
    if sample_size is not None:
        rows_to_process = rows_to_process[:sample_size]

    if len(rows_to_process) == 0:
        print("No unprocessed rows to process.")
        return

    # --- Output CSV setup -----------------------------------------------
    # Write column headers only on the very first run (when the file is new)
    if not file_exists:
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(OUTPUT_COLUMNS)

    # --- Batch loop -------------------------------------------------
    for i in range(0, len(rows_to_process), BATCH_SIZE):
        batch = rows_to_process[i:i + BATCH_SIZE]
        print(f"Processing batch {i//BATCH_SIZE + 1} of {(len(rows_to_process) + BATCH_SIZE - 1)//BATCH_SIZE}")

        # Classify words for every song in this batch (runs async under the hood)
        batch_levels = asyncio.run(process_batch(batch, api_key))

        # Attach the Level column to a copy of the batch rows
        batch_df = batch.copy()
        batch_df['Level'] = batch_levels

        # Remove the raw lyrics column if present — it's not needed in the output
        if 'cleaned_lyrics' in batch_df.columns:
            batch_df = batch_df.drop(columns=['cleaned_lyrics'])

        # Append this batch to the output CSV immediately
        # (header=False because the header was already written once at the top)
        with open(output_file, 'a', newline='', encoding='utf-8') as f:
            batch_df.to_csv(f, header=False, index=False, encoding='utf-8')

        print(f"Batch {i//BATCH_SIZE + 1} written to {output_file}")

    print(f"Output {'appended to' if file_exists else 'written to'} {output_file}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == '__main__':
    # Load the GROK3_API_KEY from a .env file in the project root.
    # The key is stored separately so it is never accidentally committed
    # to version control.
    load_dotenv()
    api_key = os.getenv('GROK3_API_KEY')
    if not api_key:
        raise ValueError("GROK3_API_KEY not found in .env file")

    # Step 1: Set file paths (defined as constants at the top of this file)
    input_file = INPUT_FILE
    output_file = OUTPUT_FILE

    # Step 2: Classify words and save results.
    # Songs already saved in the output file are automatically skipped.
    process_category_words(input_file, output_file, api_key)