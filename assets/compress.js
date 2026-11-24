
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function compressJsonFile(inputFile, outputFile) {
    // Read the source JSON file
    fs.readFile(inputFile, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error reading file ${inputFile}:`, err.message);
            return;
        }

        try {
            // 1. Parse and re-stringify to strip white space/indentation (Minification)
            const minifiedJson = JSON.stringify(JSON.parse(data));

            // 2. Compress using Gzip
            zlib.gzip(minifiedJson, (err, buffer) => {
                if (err) {
                    console.error('Error compressing data:', err.message);
                    return;
                }

                // 3. Write compressed buffer to output file
                fs.writeFile(outputFile, buffer, (err) => {
                    if (err) {
                        console.error(`Error writing file ${outputFile}:`, err.message);
                        return;
                    }

                    const originalSize = fs.statSync(inputFile).size;
                    const compressedSize = buffer.length;
                    const reduction = (((originalSize - compressedSize) / originalSize) * 100).toFixed(2);

                    console.log(`Successfully compressed!`);
                    console.log(`Original Size:   ${(originalSize / 1024).toFixed(2)} KB`);
                    console.log(`Compressed Size: ${(compressedSize / 1024).toFixed(2)} KB`);
                    console.log(`Space Saved:     ${reduction}%`);
                });
            });
        } catch (parseErr) {
            console.error('Invalid JSON content:', parseErr.message);
        }
    });
}

// Example usage:
const inputPath = path.join(__dirname, './english_words_cache.json');
const outputPath = path.join(__dirname, './english_words_cache.json.gz');

compressJsonFile(inputPath, outputPath);
