import csv

### This script is used to cut a CSV file from a specific line to the end and save it to a new file.

input_file = '../data/songs_category_before_tran2.csv'
output_file = '../data/songs_for_api_tran4.csv'
end_line =16500 

with open(input_file, 'r', encoding='utf-8') as infile, \
     open(output_file, 'w', newline='', encoding='utf-8') as outfile:
    
    reader = list(csv.reader(infile))
    writer = csv.writer(outfile)
    
    
    # Write from line to the end (accounting for 0-based index)
    writer.writerows(reader[:end_line + 1])

print(f"Rows from line {end_line} to end have been saved to {output_file}.")
