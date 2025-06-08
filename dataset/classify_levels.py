import pandas as pd
import asyncio
import aiohttp
import ast
import os
from dotenv import load_dotenv  
import csv

### Process a CSV file to classify words in the 'category_words' column into CEFR levels.
### Processes rows in batches of 10 and outputs a new CSV with a 'Level' column containing
### the original words plus the level. Resumes from the last processed row if output file exists.


async def classify_words_async(words, api_key, session):
    """
    Use Grok-3 API to classify a list of words into CEFR levels A (A1/A2), B (B1/B2), or C (C1/C2).
    Returns a single level (1 for A, 2 for B, 3 for C) based on the highest level of any word,
    or None if classification fails.
    """
    prompt = f"Classify each word or phrase in the following list into one of three CEFR (Common European Framework of Reference for Languages) difficulty levels based on their complexity and common usage: {words}. " \
             f"Level A (A1/A2): basic, common words or phrases understandable by beginners (e.g., 'sad', 'win'). " \
             f"Level B (B1/B2): intermediate words or phrases requiring moderate language proficiency (e.g., 'satisfied', 'kick'). " \
             f"Level C (C1/C2): advanced, complex, or less common words/phrases used by proficient speakers (e.g., 'numb', 'doubt'). " \
             f"Return a list of level numbers (1 for A, 2 for B, 3 for C) with exactly one number per word or phrase in the input list, in the same order, e.g., for ['sad', 'numb'], return [1, 3]. Ensure the output list length matches the input list length."

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
                print(f"Error processing words: {words}. API response missing 'choices' key. Response: {response_json}")
                return None
            result = response_json['choices'][0]['message']['content'].strip()
            try:
                result = result.replace(',', ' ').strip('[]').split()
                levels = [int(x) for x in result if x in ['1', '2', '3']]
                if not levels:
                    print(f"Invalid level returned for words: {words}. Response: {result}")
                    return None
                print(f"words: {words}-> Levels: {levels}")
                return max(levels)
            except (ValueError, SyntaxError):
                if result in ['1', '2', '3']:
                    return int(result)
                print(f"Invalid level returned for words: {words}. Response: {result}")
                return None
    except Exception as e:
        print(f"Error processing words: {words}. Error: {e}")
        return None

async def process_sublists(sublists, api_key, session):
    """
    Process a batch of word sublists for a single row.
    Returns a list of sublists, each containing the original words plus the level.
    """
    tasks = [classify_words_async(sublist, api_key, session) for sublist in sublists]
    levels = await asyncio.gather(*tasks)
    # Combine words with their levels
    return [sublist + [level] if level is not None else sublist + [None] for sublist, level in zip(sublists, levels)]

async def process_batch(batch, api_key):
    """
    Process a batch of rows asynchronously.
    Returns a list of level classifications for each row's sublists.
    """
    async with aiohttp.ClientSession() as session:
        tasks = []
        for row in batch.itertuples(index=False):
            try:
                category_words_str = getattr(row, 'category_words', None)
                if not category_words_str:
                    print(f"No category_words found for row: {row}")
                    tasks.append(asyncio.ensure_future(asyncio.sleep(0, result=[[None]])))
                    continue
                category_words = ast.literal_eval(category_words_str)
                if not isinstance(category_words, list) or not all(isinstance(sublist, list) for sublist in category_words):
                    print(f"Invalid category_words format for row: {category_words_str}")
                    tasks.append(asyncio.ensure_future(asyncio.sleep(0, result=[[None] * (len(category_words) + 1)])))
                    continue
            except (ValueError, SyntaxError) as e:
                print(f"Error parsing category_words: {category_words_str}. Error: {e}")
                tasks.append(asyncio.ensure_future(asyncio.sleep(0, result=[[None]])))
                continue
            tasks.append(process_sublists(category_words, api_key, session))
        return await asyncio.gather(*tasks)

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

def process_category_words(input_file, output_file, api_key, sample_size=None):
    """
    Process a CSV file to classify words in the 'category_words' column into CEFR levels.
    If the output CSV doesn't exist, creates it and processes from the start.
    If it exists, resumes from the last processed row and appends to the CSV.
    Processes rows in batches of 10, writes results after each batch, and outputs a CSV
    with a 'Level' column containing the original words plus the level.
    """
    try:
        df = pd.read_csv(input_file)
    except Exception as e:
        raise ValueError(f"Failed to read input CSV {input_file}: {e}")

    if 'category_words' not in df.columns:
        raise ValueError("Input CSV must contain a 'category_words' column")

    # Check if output file exists
    file_exists = os.path.exists(output_file)
    processed_count = get_processed_count(output_file) if file_exists else 0
    print(f"Output file {'exists' if file_exists else 'does not exist'}. Processed so far: {processed_count}")

    # Skip already processed rows
    rows_to_process = df[processed_count:]
    print(f"Total unprocessed rows: {len(rows_to_process)}")

    # Limit to sample_size if specified
    if sample_size is not None:
        rows_to_process = rows_to_process[:sample_size]

    if len(rows_to_process) == 0:
        print("No unprocessed rows to process.")
        return

    batch_size = 10

    # Write header to CSV only if it doesn't exist
    if not file_exists:
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['Song', 'Artist', 'Genre', 'categories', 'category_words', 'Level'])

    # Process batches and write results incrementally
    for i in range(0, len(rows_to_process), batch_size):
        batch = rows_to_process[i:i + batch_size]
        print(f"Processing batch {i//batch_size + 1} of {(len(rows_to_process) + batch_size - 1)//batch_size}")
        batch_levels = asyncio.run(process_batch(batch, api_key))

        # Create output DataFrame for the batch
        batch_df = batch.copy()
        batch_df['Level'] = batch_levels
        if 'cleaned_lyrics' in batch_df.columns:
            batch_df = batch_df.drop(columns=['cleaned_lyrics'])

        # Append batch results to CSV
        with open(output_file, 'a', newline='', encoding='utf-8') as f:
            batch_df.to_csv(f, header=False, index=False, encoding='utf-8')

        print(f"Batch {i//batch_size + 1} written to {output_file}")

    print(f"Output {'appended to' if file_exists else 'written to'} {output_file}")



if __name__ == '__main__':
    # Load environment variables
    load_dotenv()
    api_key = os.getenv('GROK3_API_KEY')
    if not api_key:
        raise ValueError("GROK3_API_KEY not found in .env file")
    input_file = '../data/filtered_songs_three1.csv'  # Input CSV file path
    output_file = '../data/song_lyrics_with_levels.csv'  # Output CSV file path
    process_category_words(input_file, output_file, api_key)