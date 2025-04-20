#!/bin/bash

# Name of the virtual environment directory
ENV_DIR="jupyter-env"

# If the virtual environment doesn't exist, create it
if [ ! -d "$ENV_DIR" ]; then
    echo "📦 Creating virtual environment in $ENV_DIR..."
    python3 -m venv "$ENV_DIR"
fi

# Activate the virtual environment
source "$ENV_DIR/bin/activate"

# Check if Jupyter Notebook is installed, if not – install it
if ! pip show notebook > /dev/null 2>&1; then
    echo "⬇️ Installing Jupyter Notebook..."
    pip install notebook
fi

# Check if pandas is installed, if not – install it
if ! pip show pandas > /dev/null 2>&1; then
    echo "⬇️ Installing pandas..."
    pip install pandas
fi

# Check if numpy is installed, if not – install it
if ! pip show numpy > /dev/null 2>&1; then
    echo "⬇️ Installing numpy..."
    pip install numpy
fi

# Check if scikit-learn is installed, if not – install it
if ! pip show scikit-learn > /dev/null 2>&1; then
    echo "⬇️ Installing scikit-learn..."
    pip install scikit-learn
fi

# Check if langdetect is installed, if not – install it
if ! pip show langdetect > /dev/null 2>&1; then
    echo "⬇️ Installing langdetect..."
    pip install langdetect
fi

if ! pip show sentence_transformers > /dev/null 2>&1; then
    echo "⬇️ Installing sentence_transformers..."
    pip install sentence_transformers
fi
    
# Start Jupyter Notebook without opening a browser, accessible from host
echo "🚀 Launching Jupyter Notebook..."
jupyter notebook --no-browser --ip=0.0.0.0 --port=8888
